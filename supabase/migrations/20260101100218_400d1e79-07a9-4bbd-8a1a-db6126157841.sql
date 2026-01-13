CREATE OR REPLACE FUNCTION public.purchase_content_with_wallet(
  p_user_id UUID,
  p_content_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_content_type TEXT;
  v_purchase_period INTEGER;
BEGIN
  -- Get balance from profiles table (not user_profiles)
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current balance: $%, Required: $%', 
      COALESCE(v_current_balance, 0), p_amount;
  END IF;

  -- Get content info
  SELECT content_type, purchase_period INTO v_content_type, v_purchase_period
  FROM content
  WHERE id = p_content_id;

  IF v_content_type IS NULL THEN
    SELECT 'episode'::TEXT INTO v_content_type;
    v_purchase_period := 30;
  END IF;

  -- Deduct from profiles table
  UPDATE profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create/update purchase record
  INSERT INTO user_content_purchases (
    user_id,
    content_id,
    purchase_date,
    expires_at,
    status,
    max_devices
  )
  VALUES (
    p_user_id,
    p_content_id,
    NOW(),
    CASE 
      WHEN v_purchase_period IS NOT NULL THEN NOW() + (v_purchase_period || ' days')::INTERVAL
      ELSE NULL
    END,
    'active',
    3
  )
  ON CONFLICT (user_id, content_id) 
  DO UPDATE SET
    purchase_date = NOW(),
    expires_at = CASE 
      WHEN v_purchase_period IS NOT NULL THEN NOW() + (v_purchase_period || ' days')::INTERVAL
      ELSE NULL
    END,
    status = 'active',
    updated_at = NOW();

  RETURN TRUE;
END;
$$;