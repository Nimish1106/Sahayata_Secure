/*
  # Create audit logs table for comprehensive activity tracking

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `project_id` (uuid, references projects)
      - `action` (text, not null)
      - `resource_type` (text, not null)
      - `resource_id` (uuid)
      - `details` (jsonb)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `audit_logs` table
    - Add policies for audit log access
*/

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all audit logs
CREATE POLICY "Admins can view all audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for project managers to view project audit logs
CREATE POLICY "Project managers can view project audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  USING (
    project_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = audit_logs.project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'manager')
    )
  );

-- Policy for users to view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy for system to insert audit logs
CREATE POLICY "System can insert audit logs" 
  ON public.audit_logs 
  FOR INSERT 
  WITH CHECK (true);