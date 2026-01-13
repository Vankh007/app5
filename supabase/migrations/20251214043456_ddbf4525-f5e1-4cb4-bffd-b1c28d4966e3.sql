-- Add recent_episode column for series/anime episode ribbon display
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS recent_episode TEXT;

-- Add last_content_update column for tracking content updates
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS last_content_update TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.content.recent_episode IS 'Recent episode number to show as ribbon on poster (e.g., "EP 12")';
COMMENT ON COLUMN public.content.last_content_update IS 'Last date when content was updated (for display purposes)';