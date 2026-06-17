-- Seed script for French with Sylvie MVP
-- All passwords are '123456'

INSERT INTO public.users (username, password_hash, full_name, role) 
VALUES
  -- 1 Teacher Account
  ('sylvie', '$2b$10$K590fE9gfmTGu.XDeSEfMe8SXUgqaVCkhBPw/vGdbSe2bHgX3CrKi', 'Sylvie Dupont', 'teacher'),
  
  -- 3 Student Accounts
  ('phuonganh', '$2b$10$K590fE9gfmTGu.XDeSEfMe8SXUgqaVCkhBPw/vGdbSe2bHgX3CrKi', 'phuonganh', 'student'),
  ('tracy', '$2b$10$K590fE9gfmTGu.XDeSEfMe8SXUgqaVCkhBPw/vGdbSe2bHgX3CrKi', 'tracy', 'student'),
  ('baotran', '$2b$10$K590fE9gfmTGu.XDeSEfMe8SXUgqaVCkhBPw/vGdbSe2bHgX3CrKi', 'baotran', 'student'),
  ('luke', '$2b$10$K590fE9gfmTGu.XDeSEfMe8SXUgqaVCkhBPw/vGdbSe2bHgX3CrKi', 'luke', 'student');
