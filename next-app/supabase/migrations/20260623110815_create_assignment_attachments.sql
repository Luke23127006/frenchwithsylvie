-- Create assignment_attachments table
CREATE TABLE public.assignment_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying NOT NULL CHECK (file_type IN ('document', 'audio')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assignment_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_attachments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.assignment_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view attachments for assignments they are assigned to
CREATE POLICY "Students can view assigned assignment attachments" ON public.assignment_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assignment_assignees
    WHERE assignment_assignees.assignment_id = assignment_attachments.assignment_id
    AND assignment_assignees.student_id = auth.uid()
  )
);

-- Policy: Teachers can perform all operations
CREATE POLICY "Teachers can perform all operations on assignment attachments" ON public.assignment_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'teacher'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'teacher'
  )
);

-- Two-Phase Migration: Migrate existing data from assignments table
INSERT INTO public.assignment_attachments (assignment_id, file_name, file_url, file_type, order_index)
SELECT 
  id, 
  'Attached Document', 
  file_url, 
  'document', 
  0
FROM public.assignments
WHERE file_url IS NOT NULL;

-- Migrate existing audio_urls array using UNNEST WITH ORDINALITY
INSERT INTO public.assignment_attachments (assignment_id, file_name, file_url, file_type, order_index)
SELECT 
  a.id, 
  'Listening Audio ' || ord.ordinality, 
  audio_url, 
  'audio', 
  CASE WHEN a.file_url IS NOT NULL THEN ord.ordinality ELSE (ord.ordinality - 1) END
FROM 
  public.assignments a,
  UNNEST(a.audio_urls) WITH ORDINALITY AS ord(audio_url, ordinality)
WHERE 
  array_length(a.audio_urls, 1) > 0;

-- Grant postgrest privileges for service_role and anon
GRANT ALL ON TABLE public.assignment_attachments TO service_role;
GRANT ALL ON TABLE public.assignment_attachments TO postgres;
GRANT ALL ON TABLE public.assignment_attachments TO anon;
GRANT ALL ON TABLE public.assignment_attachments TO authenticated;
