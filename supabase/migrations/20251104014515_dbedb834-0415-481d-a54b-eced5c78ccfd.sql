-- Add wallet_balance column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wallet_balance numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create function to add funds to wallet
CREATE OR REPLACE FUNCTION add_wallet_funds(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- Update wallet balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  -- Mark transaction as completed
  UPDATE public.payment_transactions
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_transaction_id;

  -- Return new balance
  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance
  );
END;
$$;