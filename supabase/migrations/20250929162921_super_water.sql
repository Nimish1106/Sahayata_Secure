/*
  # Create documents table for file management

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `name` (text, not null)
      - `description` (text)
      - `file_path` (text, not null)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `version` (integer, default 1)
      - `tags` (text array)
      - `uploaded_by` (uuid, references users)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `documents` table
    - Add policies for document access control
*/

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  version integer DEFAULT 1 NOT NULL,
  tags text[] DEFAULT '{}',
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy for project members to view documents
CREATE POLICY "Project members can view documents" 
  ON public.documents 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = documents.project_id 
      AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for project members to upload documents
CREATE POLICY "Project members can upload documents" 
  ON public.documents 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = documents.project_id 
      AND pm.user_id = auth.uid()
      AND (pm.permissions->>'write')::boolean = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for document owners and admins to update documents
CREATE POLICY "Document owners and admins can update documents" 
  ON public.documents 
  FOR UPDATE 
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = documents.project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'manager')
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );