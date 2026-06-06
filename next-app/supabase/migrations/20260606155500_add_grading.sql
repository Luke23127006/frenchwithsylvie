-- Add grading columns to submissions table
ALTER TABLE public.submissions
ADD COLUMN grade character varying,
ADD COLUMN feedback text;
