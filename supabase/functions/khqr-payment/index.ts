import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Flag for strict payment verification - set to true to require real Bakong payment
const STRICT_PAYMENT_VERIFICATION = true;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Retry helper function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`Retry attempt remaining: ${retries}. Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Helper function to format EMV tag-length-value
function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

// CRC16-CCITT calculation for KHQR checksum
function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// Generate proper KHQR string following EMV QR Code specification
function generateKHQR(params: {
  merchantAccount: string;
  merchantName: string;
  merchantCity: string;
  amount: string;
  currency: string;
  billNumber: string;
  storeLabel?: string;
  terminalLabel?: string;
}) {
  const {
    merchantAccount,
    merchantName,
    merchantCity,
    amount,
    currency,
    billNumber,
    storeLabel = 'KHMERZOON',
    terminalLabel = 'Topup',
  } = params;

  // Build the QR string
  let qrString = '';
  
  // 00: Payload Format Indicator
  qrString += formatTLV('00', '01');
  
  // 01: Point of Initiation Method (12 = dynamic QR)
  qrString += formatTLV('01', '12');
  
  // 29: Merchant Account Information
  const merchantInfo = formatTLV('00', merchantAccount);
  qrString += formatTLV('29', merchantInfo);
  
  // 52: Merchant Category Code
  qrString += formatTLV('52', '5999');
  
  // 53: Transaction Currency (840 = USD, 116 = KHR)
  const currencyCode = currency === 'USD' ? '840' : '116';
  qrString += formatTLV('53', currencyCode);
  
  // 54: Transaction Amount
  qrString += formatTLV('54', amount);
  
  // 58: Country Code
  qrString += formatTLV('58', 'KH');
  
  // 59: Merchant Name
  qrString += formatTLV('59', merchantName);
  
  // 60: Merchant City
  qrString += formatTLV('60', merchantCity);
  
  // 62: Additional Data Field Template
  let additionalData = '';
  additionalData += formatTLV('01', billNumber); // Bill Number
  if (storeLabel) {
    additionalData += formatTLV('03', storeLabel); // Store Label
  }
  if (terminalLabel) {
    additionalData += formatTLV('07', terminalLabel); // Terminal Label
  }
  qrString += formatTLV('62', additionalData);
  
  // 63: CRC (calculated over the string + "6304")
  qrString += '6304';
  const crc = calculateCRC16(qrString);
  qrString += crc;
  
  return qrString;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Extract JWT from header for gotrue
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    // Create Supabase client with user's JWT token for RLS (for user-scoped queries)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Create service role client for privileged operations (like add_wallet_funds)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError) {
      console.error('Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error('No user found in session');
      throw new Error('No valid user session');
    }
    
    console.log('Authenticated user:', user.id);

    const { action, amount, transactionId } = await req.json();

    const merchantAccount = Deno.env.get('BAKONG_MERCHANT_ACCOUNT');
    const apiKey = Deno.env.get('BAKONG_KHQR_API_KEY');

    console.log('Bakong credentials check:', { 
      hasMerchantAccount: !!merchantAccount, 
      hasApiKey: !!apiKey,
      action,
      amount 
    });

    if (!merchantAccount || !apiKey) {
      throw new Error('KHQR configuration missing. Please check BAKONG_MERCHANT_ACCOUNT and BAKONG_KHQR_API_KEY secrets.');
    }

    // Validate merchant account is not a placeholder
    if (merchantAccount.includes('PLACEHOLDER') || merchantAccount.includes('TO_BE_REPLACED')) {
      throw new Error('Invalid merchant account configuration. Please update BAKONG_MERCHANT_ACCOUNT secret with your actual Bakong merchant account.');
    }

    if (action === 'generate') {
      // Validate amount server-side
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0 || amountNum > 10000) {
        throw new Error('Invalid amount. Must be between $0.01 and $10,000');
      }
      
      console.log('Generating KHQR payment for amount:', amount);

      // Create payment transaction record
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          currency: 'USD',
          status: 'pending',
          payment_method: 'khqr',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes expiry
        })
        .select()
        .single();

      if (txError) {
        console.error('Error creating transaction:', txError);
        throw txError;
      }

      // Generate KHQR string
      const billNumber = transaction.id.substring(0, 20);
      const amountStr = parseFloat(amount).toFixed(2);
      
      // Extract and validate merchant name from account
      const merchantNameParts = merchantAccount.split('@');
      if (merchantNameParts.length < 2) {
        throw new Error('Invalid merchant account format. Expected format: name@bank');
      }
      
      const merchantName = merchantNameParts[0].replace(/_/g, ' ').toUpperCase();
      
      console.log('Generating KHQR with:', {
        merchantAccount,
        merchantName,
        amount: amountStr,
        billNumber
      });
      
      const qrData = generateKHQR({
        merchantAccount: merchantAccount,
        merchantName: merchantName,
        merchantCity: 'Phnom Penh',
        amount: amountStr,
        currency: 'USD',
        billNumber: billNumber,
        storeLabel: 'KHMERZOON',
        terminalLabel: 'Wallet Topup',
      });
      
      // Validate QR data doesn't contain placeholders
      if (qrData.includes('PLACEHOLDER')) {
        console.error('QR Code contains placeholders:', qrData);
        throw new Error('Failed to generate valid QR code. Please check merchant configuration.');
      }
      
      // Generate proper MD5 hash for Bakong tracking
      const md5Hash = createHash('md5').update(qrData).digest('hex');

      console.log('Generated KHQR:', { 
        length: qrData.length,
        hash: md5Hash,
        preview: qrData.substring(0, 50) + '...'
      });

      // Update payment_transactions with QR code data
      await supabase
        .from('payment_transactions')
        .update({
          qr_code_data: qrData,
          md_hash: md5Hash,
        })
        .eq('id', transaction.id);

      // Also store in payments table for Bakong tracking
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await supabase
        .from('payments')
        .insert({
          md5: md5Hash,
          amount: amount,
          currency: 'USD',
          status: 'PENDING',
          user_id: user.id,
          content_id: null,
          expires_at: expiresAt.toISOString(),
          metadata: {
            transaction_id: transaction.id,
            qr_code: qrData,
            merchant_account: merchantAccount
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: transaction.id,
          qrCode: qrData,
          amount: amount,
          expiresAt: transaction.expires_at,
          md5: md5Hash,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'check') {
      console.log('Checking payment status for transaction:', transactionId);

      // Get transaction from database
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (txError || !transaction) {
        console.error('Transaction not found:', txError);
        throw new Error('Transaction not found');
      }

      // If already completed, return success with balance
      if (transaction.status === 'completed') {
        // Get current wallet balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            amount: transaction.amount,
            newBalance: profile?.wallet_balance || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if transaction expired
      if (transaction.expires_at && new Date(transaction.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            status: 'expired',
            message: 'Payment window expired',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify we have a valid md_hash for Bakong verification
      if (!transaction.md_hash) {
        console.error('Transaction missing md_hash - cannot verify with Bakong');
        return new Response(
          JSON.stringify({
            success: false,
            status: 'error',
            message: 'Invalid transaction state - please generate a new QR code',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CRITICAL: Only update wallet if Bakong confirms payment
      // Call real Bakong API to check transaction status with retry logic
      console.log('Calling Bakong API to check payment status with hash:', transaction.md_hash);
      
      try {
        const checkData = await retryWithBackoff(async () => {
          const checkResponse = await fetch('https://api-bakong.nbc.gov.kh/v1/check_transaction_by_hash', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              hash: transaction.md_hash,
            }),
          });

          if (!checkResponse.ok) {
            const errorText = await checkResponse.text();
            console.error('Bakong API HTTP error:', {
              status: checkResponse.status,
              statusText: checkResponse.statusText,
              body: errorText
            });
            throw new Error(`Bakong API returned ${checkResponse.status}: ${checkResponse.statusText}`);
          }

          return await checkResponse.json();
        });

        console.log('Bakong API response:', JSON.stringify(checkData));

        // STRICT VERIFICATION: Only mark as completed if Bakong confirms payment
        // Check if payment was successful (responseCode: 0 means success in Bakong API)
        if (checkData.responseCode === 0 && checkData.data?.status === 'COMPLETED') {
          console.log('Payment CONFIRMED by Bakong API, updating wallet balance');

          // Update payments table to PAID (using admin client for reliability)
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'PAID',
              paid_at: new Date().toISOString(),
              transaction_id: checkData.data.transactionId || transaction.id,
            })
            .eq('md5', transaction.md_hash);

          // Call the add_wallet_funds RPC function using SERVICE ROLE client
          // This is required because the function only allows service_role execution
          const { data: walletData, error: walletError } = await supabaseAdmin
            .rpc('add_wallet_funds', {
              p_user_id: user.id,
              p_amount: transaction.amount,
              p_transaction_id: transaction.id,
            });

          if (walletError) {
            console.error('Error updating wallet:', walletError);
            throw new Error('Failed to update wallet balance');
          }

          console.log('Wallet updated successfully after Bakong verification, new balance:', walletData);

          return new Response(
            JSON.stringify({
              success: true,
              status: 'completed',
              amount: transaction.amount,
              newBalance: walletData,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Payment not completed yet - DO NOT update wallet
          console.log('Payment NOT confirmed by Bakong. Response:', checkData);
          return new Response(
            JSON.stringify({
              success: false,
              status: 'pending',
              message: 'Payment not confirmed by Bakong',
              bakongResponse: checkData.responseMessage || 'Waiting for payment confirmation',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (apiError) {
        console.error('Bakong API error after retries:', apiError);
        
        // IMPORTANT: Do NOT update wallet balance when Bakong verification fails
        // Return pending status to allow continued polling
        return new Response(
          JSON.stringify({
            success: false,
            status: 'pending',
            message: 'Payment verification in progress - please wait',
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in khqr-payment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
