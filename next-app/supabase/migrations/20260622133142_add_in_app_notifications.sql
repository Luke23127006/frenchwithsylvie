CREATE TABLE public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Completely lock down the table by enabling RLS but adding no policies.
-- All operations will be handled securely via the service role key.
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
