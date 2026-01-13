-- Add priority and auto-moderation fields to reports table
ALTER TABLE public.reports 
ADD COLUMN priority integer DEFAULT 1,
ADD COLUMN auto_flagged boolean DEFAULT false,
ADD COLUMN flag_reason text;

-- Create user_reputation table for tracking user report quality
CREATE TABLE public.user_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reputation_score integer DEFAULT 100,
  helpful_reports integer DEFAULT 0,
  spam_reports integer DEFAULT 0,
  total_reports integer DEFAULT 0,
  last_report_at timestamp with time zone,
  is_restricted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_reputation
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

-- Users can view their own reputation
CREATE POLICY "Users can view their own reputation"
ON public.user_reputation
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all reputations
CREATE POLICY "Admins can view all reputations"
ON public.user_reputation
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update reputations
CREATE POLICY "Admins can update reputations"
ON public.user_reputation
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- System can insert reputations
CREATE POLICY "System can insert reputations"
ON public.user_reputation
FOR INSERT
WITH CHECK (true);

-- Create report_analytics table for tracking metrics
CREATE TABLE public.report_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  total_reports integer DEFAULT 0,
  pending_reports integer DEFAULT 0,
  resolved_reports integer DEFAULT 0,
  rejected_reports integer DEFAULT 0,
  avg_response_time_hours numeric DEFAULT 0,
  copyright_reports integer DEFAULT 0,
  broken_link_reports integer DEFAULT 0,
  wrong_content_reports integer DEFAULT 0,
  inappropriate_reports integer DEFAULT 0,
  spam_reports integer DEFAULT 0,
  other_reports integer DEFAULT 0,
  auto_flagged_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(report_date)
);

-- Enable RLS on report_analytics
ALTER TABLE public.report_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can view analytics
CREATE POLICY "Admins can view report analytics"
ON public.report_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- System can insert/update analytics
CREATE POLICY "System can manage report analytics"
ON public.report_analytics
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user reputation
  INSERT INTO public.user_reputation (user_id, total_reports, last_report_at)
  VALUES (NEW.user_id, 1, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_reports = user_reputation.total_reports + 1,
    last_report_at = NEW.created_at,
    updated_at = now();
  
  -- If report is resolved, update reputation score
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    UPDATE public.user_reputation
    SET 
      helpful_reports = helpful_reports + 1,
      reputation_score = LEAST(reputation_score + 10, 1000),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- If report is rejected, decrease reputation
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE public.user_reputation
    SET 
      spam_reports = spam_reports + 1,
      reputation_score = GREATEST(reputation_score - 5, 0),
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Restrict user if reputation is too low
    UPDATE public.user_reputation
    SET is_restricted = true
    WHERE user_id = NEW.user_id AND reputation_score < 20;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reputation updates
CREATE TRIGGER update_reputation_trigger
AFTER INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION update_user_reputation();

-- Create function to auto-flag critical reports
CREATE OR REPLACE FUNCTION auto_flag_report()
RETURNS TRIGGER AS $$
DECLARE
  user_rep integer;
  similar_reports_count integer;
BEGIN
  -- Get user's reputation
  SELECT reputation_score INTO user_rep
  FROM public.user_reputation
  WHERE user_id = NEW.user_id;
  
  -- Copyright violations get highest priority
  IF NEW.report_type = 'copyright' THEN
    NEW.priority = 10;
    NEW.auto_flagged = true;
    NEW.flag_reason = 'Copyright violation - requires immediate attention';
  END IF;
  
  -- Inappropriate content from reputable users
  IF NEW.report_type = 'inappropriate' AND COALESCE(user_rep, 100) > 150 THEN
    NEW.priority = 8;
    NEW.auto_flagged = true;
    NEW.flag_reason = 'Inappropriate content flagged by trusted user';
  END IF;
  
  -- Check for spam (multiple similar reports in short time)
  SELECT COUNT(*) INTO similar_reports_count
  FROM public.reports
  WHERE user_id = NEW.user_id
  AND content_id = NEW.content_id
  AND created_at > now() - interval '1 hour';
  
  IF similar_reports_count > 2 THEN
    NEW.priority = 1;
    NEW.auto_flagged = true;
    NEW.flag_reason = 'Potential spam - multiple similar reports';
    
    -- Mark user as restricted
    UPDATE public.user_reputation
    SET is_restricted = true
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- High reputation users get priority
  IF COALESCE(user_rep, 100) > 200 THEN
    NEW.priority = GREATEST(NEW.priority, 5);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-flagging
CREATE TRIGGER auto_flag_report_trigger
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION auto_flag_report();

-- Create function to update daily analytics
CREATE OR REPLACE FUNCTION update_report_analytics()
RETURNS void AS $$
DECLARE
  today date := CURRENT_DATE;
  avg_time numeric;
BEGIN
  -- Calculate average response time
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
  INTO avg_time
  FROM public.reports
  WHERE DATE(resolved_at) = today
  AND resolved_at IS NOT NULL;
  
  -- Insert or update daily analytics
  INSERT INTO public.report_analytics (
    report_date,
    total_reports,
    pending_reports,
    resolved_reports,
    rejected_reports,
    avg_response_time_hours,
    copyright_reports,
    broken_link_reports,
    wrong_content_reports,
    inappropriate_reports,
    spam_reports,
    other_reports,
    auto_flagged_count
  )
  SELECT
    today,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'resolved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(avg_time, 0),
    COUNT(*) FILTER (WHERE report_type = 'copyright'),
    COUNT(*) FILTER (WHERE report_type = 'broken_link'),
    COUNT(*) FILTER (WHERE report_type = 'wrong_content'),
    COUNT(*) FILTER (WHERE report_type = 'inappropriate'),
    COUNT(*) FILTER (WHERE report_type = 'spam'),
    COUNT(*) FILTER (WHERE report_type = 'other'),
    COUNT(*) FILTER (WHERE auto_flagged = true)
  FROM public.reports
  WHERE DATE(created_at) = today
  ON CONFLICT (report_date) DO UPDATE
  SET
    total_reports = EXCLUDED.total_reports,
    pending_reports = EXCLUDED.pending_reports,
    resolved_reports = EXCLUDED.resolved_reports,
    rejected_reports = EXCLUDED.rejected_reports,
    avg_response_time_hours = EXCLUDED.avg_response_time_hours,
    copyright_reports = EXCLUDED.copyright_reports,
    broken_link_reports = EXCLUDED.broken_link_reports,
    wrong_content_reports = EXCLUDED.wrong_content_reports,
    inappropriate_reports = EXCLUDED.inappropriate_reports,
    spam_reports = EXCLUDED.spam_reports,
    other_reports = EXCLUDED.other_reports,
    auto_flagged_count = EXCLUDED.auto_flagged_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance
CREATE INDEX idx_reports_priority ON public.reports(priority DESC, created_at DESC);
CREATE INDEX idx_reports_auto_flagged ON public.reports(auto_flagged, created_at DESC) WHERE auto_flagged = true;
CREATE INDEX idx_reports_status_date ON public.reports(status, created_at DESC);
CREATE INDEX idx_user_reputation_score ON public.user_reputation(reputation_score DESC);

COMMENT ON TABLE public.user_reputation IS 'Tracks user reputation based on report quality';
COMMENT ON TABLE public.report_analytics IS 'Daily aggregated report metrics for analytics dashboard';
COMMENT ON COLUMN public.reports.priority IS 'Report priority (1-10, higher = more urgent)';
COMMENT ON COLUMN public.reports.auto_flagged IS 'Whether report was automatically flagged by system';
COMMENT ON COLUMN public.reports.flag_reason IS 'Reason for auto-flagging';