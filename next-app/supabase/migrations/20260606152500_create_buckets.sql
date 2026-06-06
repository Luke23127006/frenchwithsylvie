-- Run this script in your Supabase SQL Editor to automatically create the required storage buckets.

-- 1. Create the buckets and make them public
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('assignments', 'assignments', true),
  ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to the files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignments' OR bucket_id = 'submissions');

-- 3. Allow uploads (Using custom auth, so Supabase sees requests as 'anon'/'public')
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assignments' OR bucket_id = 'submissions');
