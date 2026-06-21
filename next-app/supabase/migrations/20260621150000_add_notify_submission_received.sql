-- Add notify_submission_received to user_notification_settings
ALTER TABLE public.user_notification_settings 
ADD COLUMN IF NOT EXISTS notify_submission_received boolean DEFAULT true NOT NULL;
