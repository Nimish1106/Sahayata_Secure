import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const signUp = async (email: string, password: string, fullName: string, organization: string, role: string = 'user') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        organization,
        role,
      }
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (data.user && !error) {
    // Log the login activity
    await logActivity('user_login', { user_id: data.user.id });
  }
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Audit logging function
export const logActivity = async (action: string, details: Record<string, any> = {}, projectId?: string, fileId?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase.from('audit_logs').insert([{
    user_id: user.id,
    project_id: projectId,
    file_id: fileId,
    action,
    details,
    created_at: new Date().toISOString(),
  }]);
};

// File upload helper
export const uploadFile = async (file: File, projectId: string, description?: string, tags?: string[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${projectId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Create database record
  const { data, error } = await supabase.from('documents').insert([{
    project_id: projectId,
    name: file.name,
    description,
    file_path: uploadData.path,
    file_size: file.size,
    file_type: file.type,
    version: 1,
    uploaded_by: user.id,
    tags,
  }]).select('*').single();

  if (error) throw error;

  // Log the activity
  await logActivity('file_uploaded', { 
    file_name: file.name, 
    file_size: file.size,
    file_type: file.type 
  }, projectId, data.id);

  return data;
};