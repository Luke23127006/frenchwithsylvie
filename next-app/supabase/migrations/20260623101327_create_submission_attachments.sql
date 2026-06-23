-- Create submission_attachments table
CREATE TABLE public.submission_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT submission_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT submission_attachments_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.submission_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own attachments
CREATE POLICY "Students can view own attachments" ON public.submission_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.submissions
    WHERE submissions.id = submission_attachments.submission_id
    AND submissions.student_id = auth.uid()
  )
);

-- Policy: Students can insert their own attachments
CREATE POLICY "Students can insert own attachments" ON public.submission_attachments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.submissions
    WHERE submissions.id = submission_attachments.submission_id
    AND submissions.student_id = auth.uid()
  )
);

-- Policy: Teachers can view all attachments
CREATE POLICY "Teachers can view all attachments" ON public.submission_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'teacher'
  )
);

-- Two-Phase Migration: Migrate existing data from submissions table
INSERT INTO public.submission_attachments (submission_id, file_name, file_url, file_type, order_index)
SELECT id, 'Uploaded Document', file_url, 'document', 0
FROM public.submissions
WHERE file_url IS NOT NULL;

INSERT INTO public.submission_attachments (submission_id, file_name, file_url, file_type, order_index)
SELECT id, 'Recorded Audio', audio_url, 'audio', 
  CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END
FROM public.submissions
WHERE audio_url IS NOT NULL;

-- Note: We are doing a two-phase rollout so we are NOT dropping file_url and audio_url from submissions yet.
