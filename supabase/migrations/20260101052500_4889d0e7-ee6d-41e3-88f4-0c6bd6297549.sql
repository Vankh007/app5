-- Drop the existing function and recreate with SECURITY DEFINER to prevent direct RPC calls
-- The function should only be callable from edge functions (service role)

DROP FUNCTION IF EXISTS public.add_wallet_funds(uuid, numeric, uuid);

-- Recreate with security checks
CREATE OR REPLACE FUNCTION public.add_wallet_funds(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
  v_transaction_status text;
BEGIN
  -- SECURITY CHECK: Verify the transaction exists and is in pending state
  -- This prevents fake transaction IDs from being used
  SELECT status INTO v_transaction_status
  FROM public.payment_transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;
  
  IF v_transaction_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or does not belong to user';
  END IF;
  
  IF v_transaction_status = 'completed' THEN
    -- Already completed, return current balance
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'newBalance', COALESCE(v_new_balance, 0),
      'message', 'Transaction already processed'
    );
  END IF;
  
  IF v_transaction_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not in pending state';
  END IF;

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

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance
  );
END;
$$;

-- Revoke direct execution from public/anon users
REVOKE EXECUTE ON FUNCTION public.add_wallet_funds(uuid, numeric, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_wallet_funds(uuid, numeric, uuid) FROM authenticated;

-- Only service role (used by edge functions) can call this
GRANT EXECUTE ON FUNCTION public.add_wallet_funds(uuid, numeric, uuid) TO service_role;