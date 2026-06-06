-- 1. Create assignment_assignees table
CREATE TABLE public.assignment_assignees (
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, student_id)
);

-- 2. Modify submissions table to strongly link to student ID
ALTER TABLE public.submissions 
ADD COLUMN student_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Note: We are keeping student_name temporarily for backward compatibility 
-- with existing UI, but the backend will rely on student_id going forward.

-- 3. Grant permissions so the Next.js backend (using anon key) can access it
GRANT ALL ON public.assignment_assignees TO anon, authenticated, service_role;
