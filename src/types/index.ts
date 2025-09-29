export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'project_manager' | 'user';
  organization: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  total_files: number;
  total_size: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  joined_at: string;
  user?: User;
  project?: Project;
}

export interface DocumentFile {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  tags?: string[];
  is_archived: boolean;
  parent_file_id?: string;
  uploader?: User;
}

export interface FileComment {
  id: string;
  file_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface AuditLog {
  id: string;
  user_id: string;
  project_id?: string;
  file_id?: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: User;
}

export interface DashboardStats {
  total_projects: number;
  total_files: number;
  total_storage: number;
  recent_activities: AuditLog[];
  active_users: number;
}