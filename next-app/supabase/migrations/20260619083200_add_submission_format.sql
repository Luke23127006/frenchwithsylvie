-- Add submission_format to assignments table to define what kind of submission the teacher expects
ALTER TABLE public.assignments 
ADD COLUMN submission_format varchar(50) DEFAULT 'document' NOT NULL;

-- Allow submissions to store an audio_url
ALTER TABLE public.submissions 
ADD COLUMN audio_url text;

-- Make file_url nullable since a submission might only be an audio file
ALTER TABLE public.submissions 
ALTER COLUMN file_url DROP NOT NULL;

-- Add a check constraint to ensure at least one type of submission is provided
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_has_file_or_audio CHECK (file_url IS NOT NULL OR audio_url IS NOT NULL);
