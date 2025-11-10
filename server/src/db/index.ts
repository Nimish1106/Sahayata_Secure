import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Nimish_1106',
  database: process.env.DB_NAME || 'sahayata_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;

export const query = async (sql: string, params?: any[]) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    conn.release();
  }
};