require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '27861992Pl～！', // 请修改为你的MySQL密码
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 连接池（延迟初始化）
let _pool = null;

// 获取连接池
function getPool() {
  if (!_pool) {
    _pool = mysql.createPool(dbConfig);
  }
  return _pool;
}

// 初始化数据库表
async function initDB() {
  try {
    // 临时连接池（不指定数据库）
    const tempPool = mysql.createPool(dbConfig);
    const conn = await tempPool.getConnection();

    // 创建数据库
    const targetDatabase = process.env.DB_NAME || 'book_management';
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${targetDatabase}`);
    conn.release();

    // 连接到目标数据库
    const dbConn = await mysql.createConnection({ ...dbConfig, database: targetDatabase });

    // 创建用户表
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建图书表
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        isbn VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        author VARCHAR(100) NOT NULL,
        publisher VARCHAR(100),
        publish_date DATE,
        category VARCHAR(50),
        total_quantity INT DEFAULT 0,
        available_quantity INT DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 创建借阅记录表
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS borrow_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date DATE NOT NULL,
        return_date TIMESTAMP NULL,
        status ENUM('borrowed', 'returned', 'overdue') DEFAULT 'borrowed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // 创建默认管理员账户 (用户名: admin, 密码: admin123)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dbConn.query(`
      INSERT IGNORE INTO users (username, password, email, role)
      VALUES ('admin', ?, 'admin@library.com', 'admin')
    `, [hashedPassword]);

    await dbConn.end();

    // 更新配置，指定数据库
    dbConfig.database = targetDatabase;

    // 关闭旧的连接池，创建新的连接池
    if (_pool) {
      await _pool.end();
    }
    _pool = mysql.createPool(dbConfig);

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

module.exports = { getPool, initDB, dbConfig };
