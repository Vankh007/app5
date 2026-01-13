-- Create video_ads table for storing video advertisements
CREATE TABLE IF NOT EXISTS public.video_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  click_url TEXT,
  duration_seconds INTEGER DEFAULT 15,
  skip_after_seconds INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  placement TEXT NOT NULL DEFAULT 'pre_roll', -- pre_roll, mid_roll, post_roll
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (needed for player)
CREATE POLICY "Video ads are viewable by everyone" 
ON public.video_ads 
FOR SELECT 
USING (true);

-- Create policy for admin insert/update/delete
CREATE POLICY "Admins can manage video ads" 
ON public.video_ads 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Add video ad settings to site_settings
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES 
  ('video_ads_enabled', 'false', 'Enable video advertisements before/during content playback'),
  ('video_ads_pre_roll', 'true', 'Show ads before video starts'),
  ('video_ads_mid_roll', 'false', 'Show ads during video playback'),
  ('video_ads_mid_roll_interval', '300', 'Seconds between mid-roll ads'),
  ('video_ads_skip_for_premium', 'true', 'Allow premium members to skip ads immediately'),
  ('video_ads_frequency_cap', '3', 'Maximum ads per session')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_video_ads_updated_at
BEFORE UPDATE ON public.video_ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();