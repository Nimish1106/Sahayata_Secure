import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Nimish_1106',
  database: process.env.DB_NAME || 'sahayata_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  multipleStatements: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  namedPlaceholders: true,
  // Configure connection timeouts
  connectTimeout: 10000,
  // Enable proper connection handling
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Test connection and create tables if they don't exist
async function initializeDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Database connected successfully');

    // Make sure all required tables exist
    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'project_manager', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT false,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id CHAR(36) NOT NULL,
        status ENUM('active', 'completed', 'archived') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create project_members table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id CHAR(36) NOT NULL,
        role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_project_member (project_id, user_id)
      )
    `);

    // Create documents table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        url VARCHAR(1024) NOT NULL,
        uploaded_by CHAR(36) NOT NULL,
        project_id INT,
        document_type VARCHAR(50),
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    console.log('Database tables verified/created successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Initialize database when imported
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default pool;
