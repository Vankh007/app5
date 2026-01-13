-- Fix 1: Restrict ad_analytics INSERT to authenticated users only
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow public insert access to ad_analytics" ON public.ad_analytics;

-- Create new authenticated-only policy
CREATE POLICY "Authenticated users can insert ad analytics" 
ON public.ad_analytics 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Fix 2: Restrict cast_members and cast_credits write operations to admin users only
-- Drop existing permissive policies
DROP POLICY IF EXISTS "cast_members_insert_policy" ON public.cast_members;
DROP POLICY IF EXISTS "cast_members_update_policy" ON public.cast_members;
DROP POLICY IF EXISTS "cast_members_delete_policy" ON public.cast_members;
DROP POLICY IF EXISTS "cast_credits_insert_policy" ON public.cast_credits;
DROP POLICY IF EXISTS "cast_credits_update_policy" ON public.cast_credits;
DROP POLICY IF EXISTS "cast_credits_delete_policy" ON public.cast_credits;

-- Create admin-only write policies for cast_members
CREATE POLICY "Admin users can insert cast members" 
ON public.cast_members 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update cast members" 
ON public.cast_members 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin users can delete cast members" 
ON public.cast_members 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin-only write policies for cast_credits
CREATE POLICY "Admin users can insert cast credits" 
ON public.cast_credits 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update cast credits" 
ON public.cast_credits 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin users can delete cast credits" 
ON public.cast_credits 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 3: Add fixed search_path to all SECURITY DEFINER functions
-- Recreate functions with proper search_path set

CREATE OR REPLACE FUNCTION public.add_wallet_funds(p_user_id uuid, p_amount numeric, p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

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
$function$;

CREATE OR REPLACE FUNCTION public.purchase_content_with_wallet(p_user_id uuid, p_content_id uuid, p_amount numeric, p_currency text DEFAULT 'USD')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_balance NUMERIC;
  v_content_type TEXT;
  v_purchase_period INTEGER;
BEGIN
  SELECT wallet_balance INTO v_current_balance
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current balance: $%, Required: $%', 
      COALESCE(v_current_balance, 0), p_amount;
  END IF;

  SELECT content_type, purchase_period INTO v_content_type, v_purchase_period
  FROM content
  WHERE id = p_content_id;

  IF v_content_type IS NULL THEN
    SELECT 'episode'::TEXT INTO v_content_type;
    v_purchase_period := 30;
  END IF;

  UPDATE user_profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

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
$function$;

CREATE OR REPLACE FUNCTION public.purchase_membership_with_wallet(p_user_id uuid, p_plan_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_balance NUMERIC;
  v_plan RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT wallet_balance INTO v_current_balance
  FROM user_profiles
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

  UPDATE user_profiles
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
$function$;

CREATE OR REPLACE FUNCTION public.support_content_with_wallet(p_user_id uuid, p_content_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  SELECT wallet_balance INTO v_current_balance
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current balance: $%, Required: $%', 
      COALESCE(v_current_balance, 0), p_amount;
  END IF;

  UPDATE user_profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO content_support (user_id, content_id, amount)
  VALUES (p_user_id, p_content_id, p_amount);

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_device_session(content_uuid uuid, device_identifier text, device_information jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_uuid UUID := auth.uid();
  device_count INTEGER;
  purchase_record RECORD;
BEGIN
  SELECT * INTO purchase_record
  FROM public.user_content_purchases
  WHERE user_id = user_uuid AND content_id = content_uuid AND status = 'active';
  
  IF purchase_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT COUNT(*) INTO device_count
  FROM public.device_sessions
  WHERE user_id = user_uuid AND content_id = content_uuid 
    AND last_active > now() - INTERVAL '24 hours';
  
  IF EXISTS (
    SELECT 1 FROM public.device_sessions
    WHERE user_id = user_uuid AND content_id = content_uuid AND device_id = device_identifier
  ) THEN
    UPDATE public.device_sessions
    SET last_active = now(), device_info = device_information
    WHERE user_id = user_uuid AND content_id = content_uuid AND device_id = device_identifier;
    RETURN true;
  END IF;
  
  IF device_count >= purchase_record.max_devices THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.device_sessions (user_id, content_id, device_id, device_info)
  VALUES (user_uuid, content_uuid, device_identifier, device_information);
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_content_access(content_uuid uuid)
RETURNS TABLE(has_access boolean, access_reason text, expires_at timestamp with time zone, devices_used integer, max_devices integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_access_type content_access_type;
  v_exclude_from_plan boolean;
  v_purchase_expires timestamptz;
  v_purchase_max_devices integer := 3;
  v_device_count integer := 0;
  v_has_purchase boolean := false;
  v_has_membership boolean := false;
BEGIN
  SELECT c.access_type, c.exclude_from_plan INTO v_access_type, v_exclude_from_plan
  FROM public.content AS c
  WHERE c.id = content_uuid;

  IF v_access_type IS NULL THEN
    RETURN QUERY SELECT FALSE, 'content_not_found'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  IF v_access_type = 'free' THEN
    RETURN QUERY SELECT TRUE, 'free_content'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'authentication_required'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.user_content_purchases AS ucp
      WHERE ucp.user_id = v_user_id
        AND ucp.content_id = content_uuid
        AND ucp.status = 'active'
        AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
    ),
    COALESCE(MAX(ucp.expires_at), NULL),
    COALESCE(MAX(ucp.max_devices), 3)
  INTO v_has_purchase, v_purchase_expires, v_purchase_max_devices
  FROM public.user_content_purchases AS ucp
  WHERE ucp.user_id = v_user_id
    AND ucp.content_id = content_uuid
    AND ucp.status = 'active';

  IF v_has_purchase THEN
    SELECT COUNT(*) INTO v_device_count
    FROM public.device_sessions ds
    WHERE ds.user_id = v_user_id
      AND ds.content_id = content_uuid
      AND ds.last_active > NOW() - INTERVAL '24 hours';

    RETURN QUERY SELECT TRUE, 'purchased'::text, v_purchase_expires, v_device_count, v_purchase_max_devices;
    RETURN;
  END IF;

  IF NOT COALESCE(v_exclude_from_plan, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_user_id
        AND um.status = 'active'
        AND (um.expires_at IS NULL OR um.expires_at > NOW())
    ) INTO v_has_membership;

    IF v_has_membership THEN
      RETURN QUERY SELECT TRUE, 'membership'::text, NULL::timestamptz, 0, 999;
      RETURN;
    END IF;
  END IF;

  IF COALESCE(v_exclude_from_plan, false) THEN
    RETURN QUERY SELECT FALSE, 'purchase_required_excluded'::text, NULL::timestamptz, 0, 0;
  ELSE
    RETURN QUERY SELECT FALSE, 'purchase_required'::text, NULL::timestamptz, 0, 0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_episode_access(episode_uuid uuid)
RETURNS TABLE(has_access boolean, access_reason text, expires_at timestamp with time zone, devices_used integer, max_devices integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_episode_access content_access_type;
  v_series_id uuid;
  v_series_access content_access_type;
  v_series_exclude_from_plan boolean;
  v_has_membership boolean := false;
  v_has_series_purchase boolean := false;
  v_has_episode_purchase boolean := false;
  v_purchase_expires timestamptz;
  v_purchase_max_devices integer := 3;
  v_device_count integer := 0;
BEGIN
  SELECT e.access_type, e.show_id, c.access_type, c.exclude_from_plan
  INTO v_episode_access, v_series_id, v_series_access, v_series_exclude_from_plan
  FROM public.episodes e
  LEFT JOIN public.content c ON c.id = e.show_id
  WHERE e.id = episode_uuid;

  IF v_episode_access IS NULL THEN
    RETURN QUERY SELECT FALSE, 'episode_not_found'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  IF v_episode_access = 'free' THEN
    RETURN QUERY SELECT TRUE, 'free_episode'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'authentication_required'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  IF v_series_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_content_purchases ucp
      WHERE ucp.user_id = v_user_id
        AND ucp.content_id = v_series_id
        AND ucp.status = 'active'
        AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
    ) INTO v_has_series_purchase;

    IF v_has_series_purchase THEN
      RETURN QUERY SELECT TRUE, 'series_purchased'::text, NULL::timestamptz, 0, 0;
      RETURN;
    END IF;
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.user_content_purchases ucp
      WHERE ucp.user_id = v_user_id
        AND ucp.content_id = episode_uuid
        AND ucp.status = 'active'
        AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
    ),
    COALESCE(MAX(ucp.expires_at), NULL),
    COALESCE(MAX(ucp.max_devices), 3)
  INTO v_has_episode_purchase, v_purchase_expires, v_purchase_max_devices
  FROM public.user_content_purchases ucp
  WHERE ucp.user_id = v_user_id
    AND ucp.content_id = episode_uuid
    AND ucp.status = 'active';

  IF v_has_episode_purchase THEN
    SELECT COUNT(*) INTO v_device_count
    FROM public.device_sessions ds
    WHERE ds.user_id = v_user_id
      AND ds.content_id = episode_uuid
      AND ds.last_active > NOW() - INTERVAL '24 hours';

    RETURN QUERY SELECT TRUE, 'episode_purchased'::text, v_purchase_expires, v_device_count, v_purchase_max_devices;
    RETURN;
  END IF;

  IF NOT COALESCE(v_series_exclude_from_plan, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_user_id
        AND um.status = 'active'
        AND (um.expires_at IS NULL OR um.expires_at > NOW())
    ) INTO v_has_membership;

    IF v_has_membership THEN
      RETURN QUERY SELECT TRUE, 'membership'::text, NULL::timestamptz, 0, 0;
      RETURN;
    END IF;
  END IF;

  IF COALESCE(v_series_exclude_from_plan, false) THEN
    RETURN QUERY SELECT FALSE, 'purchase_required_excluded'::text, NULL::timestamptz, 0, 0;
  ELSE
    RETURN QUERY SELECT FALSE, 'purchase_required'::text, NULL::timestamptz, 0, 0;
  END IF;
END;
$function$;