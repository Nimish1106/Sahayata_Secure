import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

app.use(cors());
app.use(express.json());

// Serve uploaded files as static resources
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Multer setup for file storage under uploads/<projectId>/
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
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
    cb(null, safe);
  }
});

const upload = multer({ storage });

// Auth middleware to verify JWT tokens
function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing_authorization' });
  
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid_authorization' });
  
  const token = parts[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    console.error('auth verify failed:', e);
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// File upload endpoint
app.post('/files', authMiddleware, upload.single('file'), async (req: any, res) => {
  const conn = await pool.getConnection();
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'missing_file' });
    }

    const projectId = req.query.projectId || req.body.projectId || 'general';
    const url = `/uploads/${projectId}/${file.filename}`;
    
    // Insert document metadata
    const [result] = await conn.execute<any[]>(
      `INSERT INTO documents (project_id, filename, file_size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
      [projectId, file.originalname, file.size, url, req.user?.userId]
    );

    const insertId = (result as any).insertId;

    // Log the upload
    await conn.execute(
      `INSERT INTO audit_logs (user_id, project_id, file_id, action, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user?.userId, projectId, insertId, 'file_uploaded', JSON.stringify({ filename: file.originalname, size: file.size })]
    );

    const [rows] = await conn.execute<any[]>(
      `SELECT id, project_id, filename, file_size, url, created_at FROM documents WHERE id = ? LIMIT 1`,
      [insertId]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'upload_failed' });
  } finally {
    conn.release();
  }
});