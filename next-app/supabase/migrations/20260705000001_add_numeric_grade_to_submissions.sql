-- Add numeric_grade column
ALTER TABLE public.submissions ADD COLUMN numeric_grade DECIMAL(5,2);

-- Backfill numeric_grade from existing text grade
-- This extracts the first numerical match and casts to decimal
UPDATE public.submissions 
SET numeric_grade = CAST(NULLIF(regexp_replace(grade, '[^0-9.]', '', 'g'), '') AS DECIMAL)
WHERE grade IS NOT NULL;
