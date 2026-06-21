-- 1. Create the notification settings table
CREATE TABLE public.user_notification_settings (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email character varying UNIQUE NOT NULL,
    
    -- Notification Preferences
    notify_new_assignment boolean DEFAULT true NOT NULL,
    notify_assignment_graded boolean DEFAULT true NOT NULL,
    notify_deadline_reminder boolean DEFAULT true NOT NULL,
    
    -- Audit timestamps
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON public.user_notification_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 3. Set up Row Level Security (RLS)
-- By enabling RLS without policies, we restrict all direct client access. 
-- Your server actions with the SUPABASE_SERVICE_ROLE_KEY will easily bypass this to read/write.
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
