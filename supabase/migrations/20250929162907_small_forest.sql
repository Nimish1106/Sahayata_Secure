/*
  # Create projects table for NGO workspace management

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `status` (text, default 'active')
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `projects` table
    - Add policies for project access control
*/

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active'::text NOT NULL CHECK (status IN ('active', 'archived', 'completed')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy for users to view projects they have access to
CREATE POLICY "Users can view accessible projects" 
  ON public.projects 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- Policy for admins and project managers to create projects
CREATE POLICY "Admins and project managers can create projects" 
  ON public.projects 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- Policy for project creators and admins to update projects
CREATE POLICY "Project creators and admins can update projects" 
  ON public.projects 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );