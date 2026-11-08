-- ==============================================================================
-- Leetcoder App Database Schema for Supabase (PostgreSQL)
-- Copy and run this script in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create app_users table
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'local', -- 'local' or 'google'
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow full access (Service role & Anon client)
DROP POLICY IF EXISTS "Allow full access" ON public.app_users;
CREATE POLICY "Allow full access" ON public.app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Insert default admin user if table is empty (Default password: admin123)
INSERT INTO public.app_users (username, email, password_hash, auth_provider)
VALUES (
  'admin',
  'admin@leetcoder.local',
  '43182f715a52b1c726bc8707ef20cb9d:bb3c1707cc8c73ae36d7c53be418399b49be96ac00aef6aeb56baef69fe6c734ccf5841d864a21bd3fb3db6e9c7e7fb963a0d595481051547dddeac3bfebe15f',
  'local'
)
ON CONFLICT (username) DO NOTHING;

-- 5. Create index on email and google_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_google_id ON public.app_users(google_id);
