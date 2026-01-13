-- Drop the old support_content_with_wallet function that uses user_profiles (3 args version)
DROP FUNCTION IF EXISTS public.support_content_with_wallet(uuid, uuid, numeric);

-- Recreate the 3-arg version to use profiles table
CREATE OR REPLACE FUNCTION public.support_content_with_wallet(p_user_id uuid, p_content_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get balance from profiles table
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current balance: $%, Required: $%', 
      COALESCE(v_current_balance, 0), p_amount;
  END IF;

  -- Deduct from profiles table
  UPDATE profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO content_support (user_id, content_id, amount)
  VALUES (p_user_id, p_content_id, p_amount);

  RETURN TRUE;
END;
$$;