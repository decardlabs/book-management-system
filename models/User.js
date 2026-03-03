const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');

function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

class User {
  // 创建用户
  static async create(userData) {
    const { username, password, email, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`;
    const [result] = await execute(sql, [username, hashedPassword, email, role]);
    return this.findById(result.insertId);
  }

  // 根据用户名查找用户
  static async findByUsername(username) {
    const [rows] = await execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  // 根据ID查找用户
  static async findById(id) {
    const [rows] = await execute('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  // 查找所有用户
  static async findAll() {
    const [rows] = await execute('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }

  // 验证密码
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // 更新用户
  static async update(id, userData) {
    const { username, email, role } = userData;
    const sql = `UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?`;
    await execute(sql, [username, email, role, id]);
    return this.findById(id);
  }

  // 修改密码
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    await execute(sql, [hashedPassword, id]);
    return true;
  }

  // 删除用户
  static async delete(id) {
    const [result] = await execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 获取用户统计
  static async getUserStats() {
    const [rows] = await execute(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);
    return rows;
  }
}

module.exports = User;
