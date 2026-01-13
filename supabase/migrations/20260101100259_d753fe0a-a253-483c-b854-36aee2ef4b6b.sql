-- Fix purchase_membership_with_wallet to use profiles table instead of user_profiles
CREATE OR REPLACE FUNCTION public.purchase_membership_with_wallet(p_user_id uuid, p_plan_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_plan RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get balance from profiles table (not user_profiles)
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current balance: $%, Required: $%', 
      COALESCE(v_current_balance, 0), p_amount;
  END IF;

  SELECT * INTO v_plan
  FROM membership_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Invalid membership plan';
  END IF;

  -- Deduct from profiles table
  UPDATE profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  v_expires_at := NOW();
  
  IF v_plan.duration_unit = 'days' THEN
    v_expires_at := v_expires_at + (v_plan.duration || ' days')::INTERVAL;
  ELSIF v_plan.duration_unit = 'months' THEN
    v_expires_at := v_expires_at + (v_plan.duration || ' months')::INTERVAL;
  ELSIF v_plan.duration_unit = 'years' THEN
    v_expires_at := v_expires_at + (v_plan.duration || ' years')::INTERVAL;
  END IF;

  INSERT INTO user_memberships (
    user_id,
    membership_type,
    status,
    started_at,
    expires_at
  )
  VALUES (
    p_user_id,
    v_plan.name,
    'active',
    NOW(),
    v_expires_at
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    membership_type = v_plan.name,
    status = 'active',
    started_at = NOW(),
    expires_at = v_expires_at,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Also fix support_content_with_wallet functions
CREATE OR REPLACE FUNCTION public.support_content_with_wallet(p_user_id uuid, p_content_id uuid, p_amount numeric, p_episode_id uuid DEFAULT NULL::uuid)
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

  INSERT INTO content_support (user_id, content_id, amount, episode_id)
  VALUES (p_user_id, p_content_id, p_amount, p_episode_id);

  RETURN TRUE;
END;
$$;