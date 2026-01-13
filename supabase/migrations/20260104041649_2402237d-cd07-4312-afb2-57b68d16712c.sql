-- Create app_ads table for AdMob and native app ads
CREATE TABLE public.app_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'native', 'app_open')),
  ad_unit_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'both')),
  placement TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_test_mode BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1,
  frequency_cap INTEGER DEFAULT NULL,
  show_after_seconds INTEGER DEFAULT NULL,
  reward_amount INTEGER DEFAULT NULL,
  reward_type TEXT DEFAULT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_ad_settings table for global AdMob settings
CREATE TABLE public.app_ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ad_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for app_ads (public read, admin write)
CREATE POLICY "Anyone can view active app ads" 
ON public.app_ads 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage app ads" 
ON public.app_ads 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Create policies for app_ad_settings
CREATE POLICY "Anyone can view app ad settings" 
ON public.app_ad_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage app ad settings" 
ON public.app_ad_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_ads_updated_at
BEFORE UPDATE ON public.app_ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_ad_settings_updated_at
BEFORE UPDATE ON public.app_ad_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default app ad settings
INSERT INTO public.app_ad_settings (setting_key, setting_value, description) VALUES
('admob_android_app_id', '{"app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"}', 'AdMob App ID for Android'),
('admob_ios_app_id', '{"app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"}', 'AdMob App ID for iOS'),
('global_settings', '{"enabled": true, "test_mode": true, "personalized_ads": true, "child_directed": false, "max_ad_content_rating": "G"}', 'Global AdMob settings'),
('interstitial_settings', '{"show_on_app_start": false, "show_between_episodes": true, "cooldown_seconds": 60, "max_per_session": 5}', 'Interstitial ad display settings'),
('rewarded_settings', '{"reward_multiplier": 1, "video_complete_required": true, "max_per_day": 10}', 'Rewarded ad settings'),
('banner_settings', '{"adaptive_banner": true, "refresh_rate_seconds": 60, "anchor_position": "bottom"}', 'Banner ad settings');