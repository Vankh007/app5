-- Create my_list table for users to save their favorite content
CREATE TABLE IF NOT EXISTS public.my_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Create index for faster queries
CREATE INDEX idx_my_list_user_id ON public.my_list(user_id);
CREATE INDEX idx_my_list_content_id ON public.my_list(content_id);

-- Enable RLS
ALTER TABLE public.my_list ENABLE ROW LEVEL SECURITY;

-- Users can view their own list
CREATE POLICY "Users can view their own list"
  ON public.my_list
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own list
CREATE POLICY "Users can add to their own list"
  ON public.my_list
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own list
CREATE POLICY "Users can remove from their own list"
  ON public.my_list
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fix admin reports visibility - ensure admins can see all reports
-- Drop existing admin policy and recreate with proper check
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;

CREATE POLICY "Admins can view all reports"
  ON public.reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );