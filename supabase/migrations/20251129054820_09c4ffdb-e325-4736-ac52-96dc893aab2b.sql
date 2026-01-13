-- Fix RLS policies for upcoming_releases table to allow admins to insert
-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Admins can manage upcoming releases" ON public.upcoming_releases;
DROP POLICY IF EXISTS "Anyone can view upcoming releases" ON public.upcoming_releases;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.upcoming_releases;

-- Create comprehensive admin policies
CREATE POLICY "Admins can insert upcoming releases"
ON public.upcoming_releases
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update upcoming releases"
ON public.upcoming_releases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete upcoming releases"
ON public.upcoming_releases
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Anyone can view upcoming releases"
ON public.upcoming_releases
FOR SELECT
TO public
USING (true);