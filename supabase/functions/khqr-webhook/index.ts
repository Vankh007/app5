import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Bakong webhook signature
function verifyBakongSignature(payload: string, signature: string, apiKey: string): boolean {
  try {
    const expectedSignature = createHash('sha256')
      .update(payload + apiKey)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bakongApiKey = Deno.env.get('BAKONG_KHQR_API_KEY')!;

    if (!bakongApiKey) {
      console.error('BAKONG_KHQR_API_KEY not configured');
      throw new Error('Webhook configuration missing');
    }

    // Create Supabase client with service role for unrestricted access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.text();
    const webhookData = JSON.parse(requestBody);

    console.log('Received Bakong webhook:', {
      timestamp: new Date().toISOString(),
      data: webhookData
    });

    // Verify webhook signature if provided
    const signature = req.headers.get('X-Bakong-Signature');
    if (signature && !verifyBakongSignature(requestBody, signature, bakongApiKey)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract payment data from webhook
    const {
      hash,
      transactionId,
      status,
      amount,
      currency,
      responseCode,
      responseMessage,
    } = webhookData;

    console.log('Processing payment notification:', {
      hash,
      transactionId,
      status,
      amount,
      responseCode
    });

    // Validate required fields
    if (!hash || !status) {
      console.error('Missing required fields in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Find the payment transaction by MD5 hash
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('md5', hash)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found for hash:', hash, paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if payment is already processed
    if (payment.status === 'PAID') {
      console.log('Payment already processed:', hash);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process successful payment
    if (responseCode === 0 && status === 'COMPLETED') {
      console.log('Processing successful payment:', hash);

      // Get the transaction metadata
      const metadata = payment.metadata as { transaction_id?: string };
      const transactionDbId = metadata?.transaction_id;

      if (!transactionDbId) {
        console.error('Transaction ID not found in payment metadata');
        return new Response(
          JSON.stringify({ error: 'Invalid payment metadata' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get the payment transaction
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionDbId)
        .single();

      if (txError || !transaction) {
        console.error('Transaction not found:', transactionDbId, txError);
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if already completed
      if (transaction.status === 'completed') {
        console.log('Transaction already completed:', transactionDbId);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Transaction already completed' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update payments table
      await supabase
        .from('payments')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          transaction_id: transactionId || transactionDbId,
        })
        .eq('md5', hash);

      // Update wallet balance using RPC function
      const { data: walletData, error: walletError } = await supabase
        .rpc('add_wallet_funds', {
          p_user_id: transaction.user_id,
          p_amount: transaction.amount,
          p_transaction_id: transaction.id,
        });

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        throw new Error('Failed to update wallet balance');
      }

      console.log('Payment processed successfully:', {
        hash,
        transactionId: transactionDbId,
        userId: transaction.user_id,
        amount: transaction.amount,
        newBalance: walletData
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment processed successfully',
          transactionId: transactionDbId,
          newBalance: walletData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Handle failed or other status
      console.log('Payment not successful:', {
        hash,
        status,
        responseCode,
        responseMessage
      });

      // Update payment status if needed
      if (status === 'FAILED' || status === 'CANCELLED') {
        const metadata = payment.metadata as { transaction_id?: string };
        const transactionDbId = metadata?.transaction_id;

        if (transactionDbId) {
          await supabase
            .from('payment_transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transactionDbId);
        }

        await supabase
          .from('payments')
          .update({
            status: 'FAILED',
          })
          .eq('md5', hash);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed',
          status: status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
