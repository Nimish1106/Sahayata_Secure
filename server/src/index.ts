import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

app.use(cors());
app.use(express.json());

// Serve uploaded files as static resources at /uploads
// e.g. GET /uploads/<projectId>/<filename>
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Multer setup for local file storage under server/uploads/<projectId>/
// Use a deterministic path based on process.cwd() so files are always
// written to the repo's server/uploads folder regardless of runtime __dirname behavior.
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const projectId = String(req.query.projectId || 'general');
    const dest = path.join(process.cwd(), 'uploads', projectId);
    try {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err as any, dest);
    }
  },
  filename: (_req, file, cb) => {
    // keep original filename but prefix with timestamp+random to avoid collisions
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Health
app.get('/', (_req, res) => res.json({ ok: true }));

// Register
app.post('/auth/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { email, password, fullName } = req.body;
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
      `SELECT id, email, role, is_active FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const user = created[0];
    await conn.execute(`INSERT INTO profiles (user_id, full_name) VALUES (?, ?)`, [user.id, fullName || null]);
    await conn.commit();

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, profile: { fullName } } });
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

    const [rows] = await conn.execute<any[]>(`SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1`, [email]);
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
    
    // Include role and is_active in response
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: Boolean(user.is_active),
      profile
    };

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, profile } });
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
    const [profileRows] = await conn.execute<any[]>(`SELECT full_name, avatar_url FROM profiles WHERE user_id = ? LIMIT 1`, [userId]);
    const profile = profileRows[0] || null;
    res.json({ id: user.id, email: user.email, profile });
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

    // Get documents
    const [documents] = await conn.execute<any[]>(
      `SELECT d.*, u.email as uploaded_by_email, p.full_name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE d.project_id = ?
       ORDER BY d.created_at DESC`,
      [projectId]
    );

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
    
    if (user.role !== 'admin' && user.role !== 'project_manager') {
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
      SELECT a.id, a.action, a.details, a.created_at, u.email AS user_email, p.full_name AS user_full_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN profiles p ON p.user_id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT ${safeLimit}
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});


// File upload endpoint: saves to server/uploads/<projectId>/ and inserts metadata
app.post('/files', authMiddleware, upload.single('file'), async (req: any, res) => {
  console.log('File upload request received');
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  console.log('Request file:', req.file);
  
  const conn = await pool.getConnection();
  try {
    const file = req.file;
    if (!file) {
      console.error('No file received in the request');
      return res.status(400).json({ error: 'missing_file' });
    }

    const projectIdRaw = req.query.projectId || req.body.projectId || 'general';
    const projectId = String(projectIdRaw);
    const url = `/uploads/${projectId}/${file.filename}`;
    console.log('File URL:', url);
    console.log('File details:', {
      originalname: file.originalname,
      size: file.size,
      path: file.path
    });

    // include uploaded_by (current user) in documents metadata
    const uploadedBy = req.user?.userId || null;
    const [result] = await conn.execute<any[]>(
      `INSERT INTO documents (project_id, filename, file_size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
      [projectId, file.originalname, file.size, url, uploadedBy]
    );

    const insertId = (result as any).insertId;

    await conn.execute(
      `INSERT INTO audit_logs (user_id, project_id, file_id, action, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.userId, projectId, insertId, 'file_uploaded', JSON.stringify({ filename: file.originalname, size: file.size })]
    );

    const [rows] = await conn.execute<any[]>(`SELECT id, project_id, filename, file_size, url, created_at FROM documents WHERE id = ? LIMIT 1`, [insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'upload_failed' });
  } finally {
    conn.release();
  }
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
      const userRole = rows[0].role;
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
