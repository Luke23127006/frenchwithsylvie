-- Grant UPDATE permissions on the users table so the Next.js backend (using anon key) can update the user's password and onboarding state.
GRANT UPDATE ON public.users TO anon, authenticated, service_role;
