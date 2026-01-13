-- Create a security definer function to get users with emails for admins
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  wallet_balance numeric,
  profile_image text,
  updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    au.email::text,
    p.username,
    p.wallet_balance,
    p.profile_image,
    p.updated_at,
    au.created_at
  FROM public.profiles p
  INNER JOIN auth.users au ON au.id = p.id
  ORDER BY au.created_at DESC;
END;
$$;