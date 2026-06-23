-- Grant all privileges on the new submission_attachments table to service_role, anon, and authenticated
GRANT ALL ON public.submission_attachments TO service_role;
GRANT ALL ON public.submission_attachments TO anon;
GRANT ALL ON public.submission_attachments TO authenticated;
