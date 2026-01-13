-- Create a function to notify admins of new reports
CREATE OR REPLACE FUNCTION notify_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_title TEXT;
  report_type_label TEXT;
BEGIN
  -- Get content title
  IF NEW.content_id IS NOT NULL THEN
    SELECT title INTO content_title FROM content WHERE id = NEW.content_id;
  ELSIF NEW.episode_id IS NOT NULL THEN
    SELECT title INTO content_title FROM episodes WHERE id = NEW.episode_id;
  END IF;

  -- Format report type label
  report_type_label := CASE NEW.report_type
    WHEN 'copyright' THEN 'Copyright'
    WHEN 'broken_link' THEN 'Broken Link'
    WHEN 'wrong_content' THEN 'Wrong Content'
    WHEN 'inappropriate' THEN 'Inappropriate'
    WHEN 'spam' THEN 'Spam'
    ELSE 'Other'
  END;

  -- Create admin notification
  INSERT INTO admin_notifications (type, title, message, severity, metadata)
  VALUES (
    'report',
    'New Report Submitted',
    'New ' || report_type_label || ' report for: ' || COALESCE(content_title, 'Unknown content'),
    CASE 
      WHEN NEW.priority >= 8 THEN 'error'
      WHEN NEW.priority >= 5 THEN 'warning'
      ELSE 'info'
    END,
    jsonb_build_object(
      'report_id', NEW.id,
      'report_type', NEW.report_type,
      'content_id', NEW.content_id,
      'episode_id', NEW.episode_id,
      'priority', NEW.priority,
      'auto_flagged', NEW.auto_flagged
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new reports
DROP TRIGGER IF EXISTS notify_admin_on_new_report ON reports;
CREATE TRIGGER notify_admin_on_new_report
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION notify_new_report();