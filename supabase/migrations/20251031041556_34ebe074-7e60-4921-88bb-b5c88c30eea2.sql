-- Update check_content_access function to handle exclude_from_plan
DROP FUNCTION IF EXISTS public.check_content_access(uuid);

CREATE OR REPLACE FUNCTION public.check_content_access(content_uuid uuid)
RETURNS TABLE(has_access boolean, access_reason text, expires_at timestamp with time zone, devices_used integer, max_devices integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Get content details
  SELECT c.access_type, c.exclude_from_plan INTO v_access_type, v_exclude_from_plan
  FROM public.content AS c
  WHERE c.id = content_uuid;

  IF v_access_type IS NULL THEN
    RETURN QUERY SELECT FALSE, 'content_not_found'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Free content is always accessible
  IF v_access_type = 'free' THEN
    RETURN QUERY SELECT TRUE, 'free_content'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Require auth for paid content
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'authentication_required'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Check active purchase for this content
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
    -- Count active devices in last 24h
    SELECT COUNT(*) INTO v_device_count
    FROM public.device_sessions ds
    WHERE ds.user_id = v_user_id
      AND ds.content_id = content_uuid
      AND ds.last_active > NOW() - INTERVAL '24 hours';

    RETURN QUERY SELECT TRUE, 'purchased'::text, v_purchase_expires, v_device_count, v_purchase_max_devices;
    RETURN;
  END IF;

  -- Check if excluded from plan
  -- If NOT excluded from plan, check membership access
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

  -- No access found - purchase required
  IF COALESCE(v_exclude_from_plan, false) THEN
    RETURN QUERY SELECT FALSE, 'purchase_required_excluded'::text, NULL::timestamptz, 0, 0;
  ELSE
    RETURN QUERY SELECT FALSE, 'purchase_required'::text, NULL::timestamptz, 0, 0;
  END IF;
END;
$$;

-- Update check_episode_access function to handle exclude_from_plan
DROP FUNCTION IF EXISTS public.check_episode_access(uuid);

CREATE OR REPLACE FUNCTION public.check_episode_access(episode_uuid uuid)
RETURNS TABLE(has_access boolean, access_reason text, expires_at timestamp with time zone, devices_used integer, max_devices integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Load episode and series info
  SELECT e.access_type, e.show_id, c.access_type, c.exclude_from_plan
  INTO v_episode_access, v_series_id, v_series_access, v_series_exclude_from_plan
  FROM public.episodes e
  LEFT JOIN public.content c ON c.id = e.show_id
  WHERE e.id = episode_uuid;

  IF v_episode_access IS NULL THEN
    RETURN QUERY SELECT FALSE, 'episode_not_found'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Free episode
  IF v_episode_access = 'free' THEN
    RETURN QUERY SELECT TRUE, 'free_episode'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Require auth
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'authentication_required'::text, NULL::timestamptz, 0, 0;
    RETURN;
  END IF;

  -- Series purchase unlocks episodes
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

  -- Individual episode purchase
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
    -- Count active devices
    SELECT COUNT(*) INTO v_device_count
    FROM public.device_sessions ds
    WHERE ds.user_id = v_user_id
      AND ds.content_id = episode_uuid
      AND ds.last_active > NOW() - INTERVAL '24 hours';

    RETURN QUERY SELECT TRUE, 'episode_purchased'::text, v_purchase_expires, v_device_count, v_purchase_max_devices;
    RETURN;
  END IF;

  -- Check if excluded from plan
  -- If NOT excluded from plan, check membership access
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

  -- No access found - purchase required
  IF COALESCE(v_series_exclude_from_plan, false) THEN
    RETURN QUERY SELECT FALSE, 'purchase_required_excluded'::text, NULL::timestamptz, 0, 0;
  ELSE
    RETURN QUERY SELECT FALSE, 'purchase_required'::text, NULL::timestamptz, 0, 0;
  END IF;
END;
$$;