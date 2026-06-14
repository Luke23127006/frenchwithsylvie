-- Add audio_urls to assignments for listening homework
ALTER TABLE public.assignments ADD COLUMN audio_urls text[] DEFAULT '{}'::text[];

-- Make file_url optional so assignments can be audio-only
ALTER TABLE public.assignments ALTER COLUMN file_url DROP NOT NULL;
