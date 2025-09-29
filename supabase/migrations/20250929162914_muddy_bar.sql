/*
  # Create project members table for RBAC

  1. New Tables
    - `project_members`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references users)
      - `role` (text, default 'member')
      - `permissions` (jsonb)
      - `joined_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `project_members` table
    - Add policies for project membership management
*/

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member'::text NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  permissions jsonb DEFAULT '{"read": true, "write": false, "delete": false, "manage": false}'::jsonb,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own memberships
CREATE POLICY "Users can view their own memberships" 
  ON public.project_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy for project admins to manage memberships
CREATE POLICY "Project admins can manage memberships" 
  ON public.project_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for project managers to add members
CREATE POLICY "Project managers can add members" 
  ON public.project_members 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('admin', 'manager')
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );