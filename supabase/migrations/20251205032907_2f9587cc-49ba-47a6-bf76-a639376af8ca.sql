-- Add logo_url column to networks table
ALTER TABLE public.networks ADD COLUMN IF NOT EXISTS logo_url text;