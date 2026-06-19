-- Create the enum type for submission formats
CREATE TYPE public.submission_format_type AS ENUM ('DOCUMENT', 'AUDIO', 'BOTH');

-- Drop the current string default
ALTER TABLE public.assignments 
ALTER COLUMN submission_format DROP DEFAULT;

-- Change the column type from varchar to the new enum type, casting existing values to uppercase
ALTER TABLE public.assignments 
ALTER COLUMN submission_format TYPE public.submission_format_type 
USING UPPER(submission_format)::public.submission_format_type;

-- Set the default back to 'DOCUMENT', but strictly typed to the enum
ALTER TABLE public.assignments 
ALTER COLUMN submission_format SET DEFAULT 'DOCUMENT'::public.submission_format_type;
