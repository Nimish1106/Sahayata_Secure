import { Request } from 'express';

export interface UserRequest extends Request {
  // include both `userId` and `id` to be compatible with different parts of the codebase
  user?: {
    userId?: string;
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
}

export interface DocumentFile {
  id: number;
  filename: string;
  file_size: number;
  url: string;
  user_id: number;
  project_id?: number;
  project_name?: string;
  document_type?: string;
  status?: string;
  created_at: string;
  uploaded_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  organization_id?: number;
}