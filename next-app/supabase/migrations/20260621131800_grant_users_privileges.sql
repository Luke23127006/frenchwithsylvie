-- Grant all privileges on the users table to the service_role
-- This allows backend server actions to query the users table and joined tables
GRANT ALL ON public.users TO service_role;
