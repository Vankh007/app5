-- Update the support_content_with_wallet function to handle episode_id for per-episode support tracking
CREATE OR REPLACE FUNCTION public.support_content_with_wallet(
  p_user_id uuid, 
  p_content_id uuid, 
  p_amount numeric,
  p_episode_id uuid DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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

  INSERT INTO content_support (user_id, content_id, amount, episode_id)
  VALUES (p_user_id, p_content_id, p_amount, p_episode_id);

  RETURN TRUE;
END;
$function$;