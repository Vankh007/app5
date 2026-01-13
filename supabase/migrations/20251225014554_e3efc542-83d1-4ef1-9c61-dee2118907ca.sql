-- Add episode_id column to content_support table for per-episode tracking
ALTER TABLE public.content_support 
ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL;