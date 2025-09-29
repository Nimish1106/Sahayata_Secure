/*
  # Create users table for NGO document management system

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `full_name` (text)
      - `organization` (text)
      - `role` (text, default 'user')
      - `created_at` (timestamptz, default now)
      - `last_login` (timestamptz)
      - `is_active` (boolean, default true)

  2. Security
    - Enable RLS on `users` table
    - Add policies for users to manage their own profiles
    - Add policy for admins to view all users
*/

CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  organization text,
  role text DEFAULT 'user'::text NOT NULL CHECK (role IN ('admin', 'project_manager', 'user')),
  created_at timestamptz DEFAULT now() NOT NULL,
  last_login timestamptz,
  is_active boolean DEFAULT true NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy for users to create their own profile
CREATE POLICY "Users can create their own profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy for admins to view all users
CREATE POLICY "Admins can view all users" 
  ON public.users 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );