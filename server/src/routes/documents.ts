import { Router } from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { UserRequest } from '../types';

// (multer storage and router are declared below)

const router = Router();
const mkdir = promisify(fs.mkdir);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads');
    try {
      await mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err as Error, dir);
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Get all documents for the authenticated user
router.get('/user', authenticateToken, async (req: UserRequest, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [rows] = await conn.execute(
      `SELECT d.*, p.name as project_name 
       FROM documents d 
       LEFT JOIN projects p ON d.project_id = p.id 
       WHERE d.uploaded_by = ?
       ORDER BY d.created_at DESC`,
      [userId]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    conn.release();
  }
});

// Upload a new document
router.post('/upload', authenticateToken, upload.single('file'), async (req: UserRequest, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = req.body.project_id;
    const documentType = req.body.document_type;

    const [result] = await conn.execute(
      'INSERT INTO documents (filename, file_size, url, uploaded_by, project_id, document_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        file.originalname,
        file.size,
        file.filename,
        userId,
        projectId || null,
        documentType || null,
        'pending'
      ]
    );

    const documentId = (result as any).insertId;
    const [rows] = await conn.execute('SELECT * FROM documents WHERE id = ?', [documentId]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    conn.release();
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req: UserRequest, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [rows] = await conn.execute(
      'SELECT * FROM documents WHERE id = ? AND uploaded_by = ?',
      [req.params.id, userId]
    );

    const document = (rows as any[])[0];
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  } finally {
    conn.release();
  }
});
export default router;