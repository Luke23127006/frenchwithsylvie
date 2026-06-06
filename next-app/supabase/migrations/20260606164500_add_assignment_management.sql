-- 1. Add is_hidden and deleted_at to assignments table
ALTER TABLE public.assignments
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Drop the existing foreign key constraint on submissions
ALTER TABLE public.submissions
DROP CONSTRAINT submissions_assignment_id_fkey;

-- 3. Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
