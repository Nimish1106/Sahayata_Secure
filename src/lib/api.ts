const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('token');
}

export async function request(path: string, opts: RequestInit = {}) {
  try {
    const headers: Record<string,string> = (opts.headers as Record<string,string>) || {};
    headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const text = await res.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Invalid JSON response from server');
    }
    
    if (!res.ok) {
      const error = data?.message || data?.error || `HTTP error ${res.status}`;
      const e = new Error(error);
      (e as any).status = res.status;
      (e as any).data = data;
      throw e;
    }
    
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Network error - Failed to connect to server');
    }
    throw err;
  }
}

export async function apiRegister(email: string, password: string, fullName?: string, organization?: string) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName, organization }) });
}

export async function apiLogin(email: string, password: string) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function apiMe() {
  return request('/auth/me', { method: 'GET' });
}

export async function apiGetProjects() {
  return request('/projects', { method: 'GET' });
}

export async function apiGetAuditLogs(limit = 5) {
  return request(`/audit_logs?limit=${limit}`, { method: 'GET' });
}

export async function apiUploadFile(file: File, projectId: string, description?: string, tags?: string[]) {
  try {
    const token = getToken();
    const headers: Record<string,string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    if (tags) form.append('tags', JSON.stringify(tags));

    const url = `${API_BASE}/files?projectId=${encodeURIComponent(String(projectId))}`;
    const res = await fetch(url, { method: 'POST', headers, body: form });
    const text = await res.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Invalid JSON response from server');
    }

    if (!res.ok) {
      const error = data?.message || data?.error || `HTTP error ${res.status}`;
      const e = new Error(error);
      (e as any).status = res.status;
      (e as any).data = data;
      throw e;
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Network error - Failed to upload file');
    }
    throw err;
  }
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function apiCreateProject(name: string, description?: string) {
  return request('/projects', { 
    method: 'POST', 
    body: JSON.stringify({ name, description }) 
  });
}

export async function apiGetProjectById(projectId: string) {
  return request(`/projects/${projectId}`, { method: 'GET' });
}

export async function apiVerifyDocument(documentId: string) {
  return request(`/documents/${documentId}/verify`, { method: 'POST' });
}

export async function apiGetPendingDocuments() {
  return request('/documents/pending', { method: 'GET' });
}

export async function apiGetUsers(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/users${q}`, { method: 'GET' });
}

export async function apiApproveUser(userId: string) {
  return request(`/auth/approve/${userId}`, { method: 'POST' });
}

export async function apiGetProjectMembers(projectId: string) {
  return request(`/projects/${projectId}/members`, { method: 'GET' });
}

export async function apiAddProjectMember(projectId: string, email: string, role = 'viewer') {
  return request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ email, role }) });
}

export async function apiRemoveProjectMember(projectId: string, userId: string) {
  return request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
}

export default { 
  apiRegister, 
  apiLogin, 
  apiMe, 
  apiGetProjects, 
  apiCreateProject, 
  apiGetProjectById,
  apiGetAuditLogs, 
  setToken 
};
