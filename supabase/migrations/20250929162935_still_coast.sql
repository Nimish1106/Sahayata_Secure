/*
  # Create document comments table for team collaboration

  1. New Tables
    - `document_comments`
      - `id` (uuid, primary key)
      - `document_id` (uuid, references documents)
      - `user_id` (uuid, references users)
      - `content` (text, not null)
      - `parent_id` (uuid, references document_comments)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `document_comments` table
    - Add policies for comment access control
*/

CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.document_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Policy for project members to view comments
CREATE POLICY "Project members can view comments" 
  ON public.document_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.project_members pm ON d.project_id = pm.project_id
      WHERE d.id = document_comments.document_id 
      AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for project members to add comments
CREATE POLICY "Project members can add comments" 
  ON public.document_comments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.project_members pm ON d.project_id = pm.project_id
      WHERE d.id = document_comments.document_id 
      AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for comment authors to update their comments
CREATE POLICY "Comment authors can update their comments" 
  ON public.document_comments 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Policy for comment authors and admins to delete comments
CREATE POLICY "Comment authors and admins can delete comments" 
  ON public.document_comments 
  FOR DELETE 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );