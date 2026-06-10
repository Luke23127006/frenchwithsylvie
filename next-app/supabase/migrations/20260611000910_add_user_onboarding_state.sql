-- Create the enum type for onboarding state
CREATE TYPE public.onboarding_state AS ENUM ('PENDING', 'COMPLETED');

-- Add the 'state' column to the users table with a default value
ALTER TABLE public.users 
ADD COLUMN state public.onboarding_state DEFAULT 'PENDING'::public.onboarding_state NOT NULL;
