-- Create upcoming_releases table
CREATE TABLE IF NOT EXISTS public.upcoming_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'movie',
  tmdb_id INTEGER,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'released', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upcoming_releases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view upcoming releases"
  ON public.upcoming_releases
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage upcoming releases"
  ON public.upcoming_releases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index
CREATE INDEX idx_upcoming_releases_date ON public.upcoming_releases(release_date DESC);
CREATE INDEX idx_upcoming_releases_status ON public.upcoming_releases(status);