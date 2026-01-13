-- Add view_count column to content table for tracking views
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create content_views table for detailed view tracking
CREATE TABLE IF NOT EXISTS public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id uuid DEFAULT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE CASCADE DEFAULT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  session_id text DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view content view counts (for display)
CREATE POLICY "Anyone can view content views" ON public.content_views
FOR SELECT USING (true);

-- Allow authenticated users to create views
CREATE POLICY "Authenticated users can create views" ON public.content_views
FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON public.content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_user_id ON public.content_views(user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = p_content_id;
END;
$$;