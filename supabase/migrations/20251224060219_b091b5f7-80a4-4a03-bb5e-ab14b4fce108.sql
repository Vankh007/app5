-- Insert default Support Us settings if they don't exist
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES 
  ('support_us_enabled', 'true', 'Enable or disable the Support Us overlay on video player'),
  ('support_us_countdown_seconds', '10', 'Duration in seconds for the Support Us overlay countdown'),
  ('support_us_checkpoint_start', 'true', 'Show Support Us overlay when video starts playing'),
  ('support_us_checkpoint_50', 'true', 'Show Support Us overlay at 50% of video progress'),
  ('support_us_checkpoint_85', 'true', 'Show Support Us overlay at 85% of video progress'),
  ('support_us_amounts', '[0.5, 1, 2, 5]', 'Available support amounts in dollars')
ON CONFLICT (setting_key) DO NOTHING;