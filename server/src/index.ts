import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db';
import documentsRouter from './routes/documents';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

// Global error handler
const handleError = (err: any, res: any) => {
  console.error('Error:', err);
  if (err.code === 'ER_NO_SUCH_TABLE') {
    res.status(500).json({ error: 'database_not_initialized' });
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    res.status(500).json({ error: 'database_connection_failed' });
  } else {
    res.status(500).json({ error: 'internal_error', details: err.message });
  }
};

dotenv.config();

// Validate Cloudinary credentials at startup to fail fast if misconfigured
const missingCloudinary = [] as string[];
if (!process.env.CLOUDINARY_CLOUD_NAME) missingCloudinary.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_API_KEY) missingCloudinary.push('CLOUDINARY_API_KEY');
if (!process.env.CLOUDINARY_API_SECRET) missingCloudinary.push('CLOUDINARY_API_SECRET');
if (missingCloudinary.length) {
  console.error(`Missing Cloudinary configuration: ${missingCloudinary.join(', ')}. Please set these in your environment (server/.env).`);
  // Exit early - prevents runtime upload failures later
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

app.use(cors());
app.use(express.json());

// Register documents router
app.use('/documents', documentsRouter);

// Serve uploaded files as static resources at /uploads
// e.g. GET /uploads/<projectId>/<filename>
// By default we disable serving local uploads so only Cloudinary URLs are used.
// Set USE_LOCAL_UPLOADS=true in the server environment if you want to enable local serving for development.
if (process.env.USE_LOCAL_UPLOADS === 'true') {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  console.log('Serving local uploads at /uploads (USE_LOCAL_UPLOADS=true)');
} else {
  console.log('Local uploads serving disabled (USE_LOCAL_UPLOADS != true). Using Cloudinary for file delivery.');
}

// Multer setup - use memoryStorage for streaming upload to Cloudinary and set a fileSize limit
// to avoid using too much memory. Limit set to 25 MB (adjustable).
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

// Helper function to upload buffer to Cloudinary (typed)
function uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('No result from Cloudinary'));
        resolve(result as UploadApiResponse);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// Health
app.get('/', (_req, res) => res.json({ ok: true }));

// Register
app.post('/auth/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { email, password, fullName, organization } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    // check existing
    const [rows] = await conn.execute<any[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (rows.length) return res.status(409).json({ error: 'user exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    await conn.beginTransaction();
    // create user with UUID()
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, role, is_active) VALUES (UUID(), ?, ?, 'user', FALSE)`,
      [email, passwordHash]
    );
    const [created] = await conn.execute<any[]>(
      `SELECT id, email, role, is_active, created_at FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const user = created[0];
    // Store profile including optional organization
    await conn.execute(`INSERT INTO profiles (user_id, full_name, organization) VALUES (?, ?, ?)`, [user.id, fullName || null, organization || null]);
    await conn.commit();

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, created_at: user.created_at, profile: { full_name: fullName || null, organization: organization || null } } });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const [rows] = await conn.execute<any[]>(`SELECT id, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    // Update last_login
    await conn.execute(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.id]);

    const [profileRows] = await conn.execute<any[]>(
      `SELECT full_name, avatar_url FROM profiles WHERE user_id = ? LIMIT 1`,
      [user.id]
    );
    const profile = profileRows[0] || null;
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, is_active: Boolean(user.is_active), profile } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  console.log('auth header:', !!auth);
  if (!auth) return res.status(401).json({ error: 'missing_authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid_authorization' });
  const token = parts[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch (e) {
    console.error('auth verify failed:', e);
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// Me
app.get('/auth/me', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user?.userId;
  const [rows] = await conn.execute<any[]>(`SELECT id, email FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const user = rows[0];
    // Select known user fields
    const [userRows] = await conn.execute<any[]>(`SELECT role, is_active FROM users WHERE id = ? LIMIT 1`, [userId]);
    const userMeta = userRows[0] || {};
    // Read profile including organization if present
    const [profileRows] = await conn.execute<any[]>(`SELECT full_name, avatar_url, organization FROM profiles WHERE user_id = ? LIMIT 1`, [userId]);
    const profile = profileRows[0] || null;
    res.json({ id: user.id, email: user.email, role: userMeta.role, is_active: Boolean(userMeta.is_active), profile, organization: profile?.organization || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Projects CRUD
app.get('/projects', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'user_not_authenticated' });
    }
    
    // First verify user exists and is active
    const [users] = await conn.execute<any[]>(
      'SELECT role, is_active FROM users WHERE id = ?',
      [userId]
    );
    
    if (!users.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'account_not_activated' });
    }

      // Get projects with their stats in a single query
      const [projects] = await conn.execute<any[]>(`
        SELECT 
          p.*,
          COALESCE(d.doc_count, 0) as total_files,
          COALESCE(d.total_size, 0) as total_size,
          COALESCE(m.member_count, 0) as member_count,
          GREATEST(p.updated_at, COALESCE(d.last_doc, p.created_at)) as last_updated
        FROM projects p
        LEFT JOIN (
          SELECT project_id, 
                 COUNT(*) as doc_count,
                 SUM(file_size) as total_size,
                 MAX(created_at) as last_doc
          FROM documents
          GROUP BY project_id
        ) d ON d.project_id = p.id
        LEFT JOIN (
          SELECT project_id,
                 COUNT(DISTINCT user_id) as member_count
          FROM project_members
          GROUP BY project_id
        ) m ON m.project_id = p.id
        WHERE p.owner_id = ?
           OR EXISTS (
             SELECT 1 FROM project_members
             WHERE project_id = p.id 
               AND user_id = ?
           )
        ORDER BY last_updated DESC`,
        [userId, userId]
      );
    // Format dates and ensure proper types
    const formattedProjects = projects.map(project => ({
      ...project,
      status: project.status || 'active',
      total_files: Number(project.total_files || 0),
      total_size: Number(project.total_size || 0),
      member_count: Number(project.member_count || 0),
      created_at: new Date(project.created_at).toISOString(),
      updated_at: new Date(project.updated_at).toISOString(),
      last_updated: new Date(project.last_updated).toISOString()
    }));

    res.json(formattedProjects);
  } catch (err) {
    console.error('Error in /projects:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Create project
// Get project by ID with documents
app.get('/projects/:id', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const projectId = req.params.id;
    const userId = req.user?.userId;
    console.log('/projects/:id requested', { projectId, userId });

    // First check if user has access to this project
    const [project] = await conn.execute<any[]>(
      `SELECT p.*, pm.role as member_role 
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL)
       LIMIT 1`,
      [userId, projectId, userId]
    );

    if (!project.length) {
      return res.status(404).json({ error: 'project_not_found' });
    }

    // Get user role
    const [userRows] = await conn.execute<any[]>(
      `SELECT role FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const userRole = userRows.length ? userRows[0].role : 'user';
    // Treat 'project_manager' as 'admin'
    const effectiveRole = userRole === 'project_manager' ? 'admin' : userRole;
    // Get documents: admins see all, users see only verified
    let documentsQuery = `SELECT d.*, u.email as uploaded_by_email, p.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE d.project_id = ?`;
    const queryParams: any[] = [projectId];
    if (effectiveRole !== 'admin') {
      documentsQuery += ' AND d.status = "verified"';
    }
    documentsQuery += ' ORDER BY d.created_at DESC';
    const [documents] = await conn.execute<any[]>(documentsQuery, queryParams);

    res.json({
      ...project[0],
      documents,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

app.post('/projects', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    // First check if user has appropriate role
    const [userRows] = await conn.execute<any[]>(
      `SELECT role, is_active FROM users WHERE id = ? LIMIT 1`,
      [req.user.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: 'user_not_found' });
    const user = userRows[0];
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'account_not_active' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'insufficient_permissions' });
    }

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const [result] = await conn.execute<any[]>(
      `INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)`,
      [name, description || null, req.user.userId]
    );

    const insertId = (result as any).insertId;
    const [project] = await conn.execute<any[]>(
      `SELECT id, name, description, created_at FROM projects WHERE id = ?`,
      [insertId]
    );

    // Log project creation
    await conn.execute(
      `INSERT INTO audit_logs (user_id, project_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user.userId, insertId, 'project_created', JSON.stringify({ name, description })]
    );

    res.json(project[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Audit logs
app.get('/audit_logs', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const limit = Number(req.query.limit) || 10;
    const safeLimit = Math.max(1, Math.min(limit, 100)); // avoid injection
    const [rows] = await conn.query(`
      SELECT a.id, a.action, a.details, a.created_at, a.user_id as user_id, u.email AS user_email, p.full_name AS user_full_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN profiles p ON p.user_id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT ${safeLimit}
    `);

    // Normalize response to include a nested `user` object which the frontend expects.
    const normalized = (rows as any[]).map(r => ({
      id: r.id,
      action: r.action,
      // Try to parse JSON details if stored as string
      details: typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : r.details,
      created_at: r.created_at,
      user: {
        id: r.user_id || null,
        email: r.user_email || null,
        full_name: r.user_full_name || null,
      }
    }));

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Admin: list pending documents across projects
app.get('/documents/pending', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<any[]>(`
      SELECT d.id, d.project_id, d.filename, d.file_size, d.url, d.created_at,
             u.id as uploaded_by, u.email as uploaded_by_email, p.full_name as uploaded_by_name,
             proj.name as project_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN projects proj ON proj.id = d.project_id
      WHERE d.status = 'pending'
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching pending documents:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});


// File upload endpoint: saves to server/uploads/<projectId>/ and inserts metadata
// File upload endpoint: stream to Cloudinary and insert metadata
app.post('/files', authMiddleware, async (req: any, res) => {
  // Use multer.single manually so we can catch Multer errors and return 413 if file too large
  const single = upload.single('file');
  single(req, res, async (uploadErr: any) => {
    const conn = await pool.getConnection();
    try {
      if (uploadErr) {
        console.error('Multer error during upload:', uploadErr);
        if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE });
        }
        return res.status(400).json({ error: 'upload_error', details: uploadErr.message || String(uploadErr) });
      }

      console.log('File upload request received');
      console.log('Request body:', req.body);
      console.log('Request query:', req.query);
      console.log('Request file:', req.file);

      const file = req.file;
      if (!file) {
        console.error('No file received in the request');
        return res.status(400).json({ error: 'missing_file' });
      }

      // Basic MIME type / extension validation (documents & images)
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];
      if (!allowed.includes(file.mimetype)) {
        console.error('Rejected file due to unsupported mime type:', file.mimetype);
        return res.status(415).json({ error: 'unsupported_media_type' });
      }

      // Validate projectId: must be a positive integer. Do NOT default to 'general' for DB.
      const projectIdRaw = req.query.projectId ?? req.body.projectId;
      if (projectIdRaw === undefined || projectIdRaw === null) {
        return res.status(400).json({ error: 'projectId_required' });
      }
      const projectIdNum = parseInt(String(projectIdRaw), 10);
      if (Number.isNaN(projectIdNum) || projectIdNum <= 0) {
        return res.status(400).json({ error: 'invalid_projectId' });
      }

      // Cloudinary folder name can default to string form; DB uses numeric project id
      const folderName = String(projectIdNum) || 'general';

      // Upload to Cloudinary (typed)
      const uploadResult = await uploadToCloudinary(file.buffer, folderName);
      const url = (uploadResult.secure_url || uploadResult.url) as string;
      console.log('Cloudinary file URL:', url);
      console.log('File details:', { originalname: file.originalname, size: file.size });

      // include uploaded_by (current user) in documents metadata
      const uploadedBy = req.user?.userId || null;
      // All uploads are marked as 'pending' until verified by admin
      const [result] = await conn.execute<any[]>(
        `INSERT INTO documents (project_id, filename, file_size, url, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [projectIdNum, file.originalname, file.size, url, uploadedBy, 'pending']
      );

      const insertId = (result as any).insertId;

      await conn.execute(
        `INSERT INTO audit_logs (user_id, project_id, file_id, action, details) VALUES (?, ?, ?, ?, ?)`,
        [req.user.userId, projectIdNum, insertId, 'file_uploaded', JSON.stringify({ filename: file.originalname, size: file.size })]
      );

      const [rows] = await conn.execute<any[]>(`SELECT id, project_id, filename, file_size, url, created_at FROM documents WHERE id = ? LIMIT 1`, [insertId]);
      res.json(rows[0]);
    } catch (err) {
      console.error('Upload handler error:', err);
      // If Multer threw an error it would have been handled above; here return generic 500
      res.status(500).json({ error: 'upload_failed' });
    } finally {
      conn.release();
    }
  });
});

// Role-based middleware
function requireRole(roles: string[]) {
  return async (req: any, res: any, next: any) => {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<any[]>(
        `SELECT role FROM users WHERE id = ? LIMIT 1`,
        [req.user.userId]
      );
      if (!rows.length) return res.status(404).json({ error: 'user_not_found' });
      let userRole = rows[0].role;
      // Treat 'project_manager' as 'admin' for permissions
      if (userRole === 'project_manager') userRole = 'admin';
      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: 'insufficient_permissions' });
      }
      next();
    } finally {
      conn.release();
    }
  };
}

// Approve user (admin only)
// Admin document verification endpoint
app.post('/documents/:id/verify', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const documentId = req.params.id;
    // Set status to 'verified'
    await conn.execute(
      `UPDATE documents SET status = 'verified' WHERE id = ?`,
      [documentId]
    );
    // Log verification
    await conn.execute(
      `INSERT INTO audit_logs (user_id, file_id, action, details) VALUES (?, ?, 'document_verified', ?)`,
      [req.user.userId, documentId, JSON.stringify({ documentId })]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'verification_failed' });
  } finally {
    conn.release();
  }
});
app.post('/auth/approve/:userId', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId } = req.params;
    await conn.execute(
      `UPDATE users SET is_active = TRUE WHERE id = ?`,
      [userId]
    );
    
    // Log the approval
    await conn.execute(
      `INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'user_approved', ?)`,
      [req.user.userId, JSON.stringify({ approved_user_id: userId })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Admin: list users (optionally filter pending)
app.get('/users', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const status = String(req.query.status || 'all');
  let q = `SELECT u.id, u.email, u.role, u.is_active, p.full_name, p.organization AS organization, u.created_at FROM users u LEFT JOIN profiles p ON p.user_id = u.id`;
    const params: any[] = [];
    if (status === 'pending') {
      q += ' WHERE u.is_active = FALSE';
    }
    q += ' ORDER BY u.created_at DESC';
    const [rows] = await conn.execute<any[]>(q, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Project members management
app.get('/projects/:id/members', authMiddleware, async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const projectId = req.params.id;
    const [rows] = await conn.execute<any[]>(`
      SELECT pm.user_id, pm.role, pm.joined_at, u.email, p.full_name
      FROM project_members pm
      LEFT JOIN users u ON u.id = pm.user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE pm.project_id = ?
    `, [projectId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

app.post('/projects/:id/members', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const projectId = req.params.id;
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email_required' });

    const [users] = await conn.execute<any[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!users.length) return res.status(404).json({ error: 'user_not_found' });
    const userId = users[0].id;

    await conn.execute(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId, userId, role || 'viewer']);
    await conn.execute(`INSERT INTO audit_logs (user_id, project_id, action, details) VALUES (?, ?, 'member_added', ?)`, [req.user.userId, projectId, JSON.stringify({ added_user: userId, role: role || 'viewer' })]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

app.delete('/projects/:id/members/:userId', authMiddleware, requireRole(['admin']), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;
    await conn.execute(`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`, [projectId, userId]);
    await conn.execute(`INSERT INTO audit_logs (user_id, project_id, action, details) VALUES (?, ?, 'member_removed', ?)`, [req.user.userId, projectId, JSON.stringify({ removed_user: userId })]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Make first registered user an admin
app.post('/auth/init-admin', async (_req, res) => {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.execute<any[]>(`SELECT COUNT(*) as count FROM users`);
    if (users[0].count === 0) {
      res.json({ 
        message: 'No users exist. The next user to register will be made an admin.',
        setup_needed: true
      });
      return;
    }
    res.json({ message: 'System already initialized', setup_needed: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Export app for testing
export default app;