-- Add trailer columns to slider_settings table
ALTER TABLE slider_settings
ADD COLUMN IF NOT EXISTS trailer_youtube_id TEXT,
ADD COLUMN IF NOT EXISTS trailer_self_hosted TEXT;