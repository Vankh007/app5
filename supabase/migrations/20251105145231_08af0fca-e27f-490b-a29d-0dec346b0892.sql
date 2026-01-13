-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read notifications
CREATE POLICY "Anyone can view notifications"
ON public.admin_notifications
FOR SELECT
USING (true);

-- Create policy to allow authenticated users to update their read status
CREATE POLICY "Users can mark notifications as read"
ON public.admin_notifications
FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);

-- Function to create notification for content updates
CREATE OR REPLACE FUNCTION public.notify_content_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if title or other important fields changed
  IF (TG_OP = 'UPDATE' AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.overview IS DISTINCT FROM NEW.overview)) OR TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
      TG_OP,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'New Content Added: ' || NEW.title
        ELSE 'Content Updated: ' || NEW.title
      END,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'A new title "' || NEW.title || '" has been added to the library.'
        ELSE 'The title "' || NEW.title || '" has been updated.'
      END,
      'info',
      jsonb_build_object(
        'content_id', NEW.id,
        'content_title', NEW.title,
        'operation', TG_OP
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for content table
DROP TRIGGER IF EXISTS content_update_notification ON public.content;
CREATE TRIGGER content_update_notification
AFTER INSERT OR UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_content_update();

-- Enable realtime for admin_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;