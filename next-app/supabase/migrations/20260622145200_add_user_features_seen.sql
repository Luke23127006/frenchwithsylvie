CREATE TABLE public.user_features_seen (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, feature_key)
);

-- Completely lock down the table by enabling RLS but adding no policies.
-- All operations will be handled securely via the service role key.
ALTER TABLE public.user_features_seen ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.user_features_seen TO service_role;
GRANT ALL ON TABLE public.user_features_seen TO postgres;
