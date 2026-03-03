const { getPool } = require('../config/db');

function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

class BorrowRecord {
  // 创建借阅记录
  static async create(userId, bookId, dueDays = 30) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const sql = `INSERT INTO borrow_records (user_id, book_id, due_date) VALUES (?, ?, ?)`;
    const [result] = await execute(sql, [userId, bookId, dueDate.toISOString().split('T')[0]]);

    return this.findById(result.insertId);
  }

  // 查找所有借阅记录
  static async findAll(filters = {}) {
    let sql = `SELECT br.*, u.username as user_name, b.title as book_title, b.author as book_author, b.isbn
               FROM borrow_records br
               JOIN users u ON br.user_id = u.id
               JOIN books b ON br.book_id = b.id
               WHERE 1=1`;
    const params = [];

    if (filters.user_id) {
      sql += ' AND br.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.status) {
      sql += ' AND br.status = ?';
      params.push(filters.status);
    }
    if (filters.overdue) {
      sql += ' AND br.due_date < CURDATE() AND br.status = "borrowed"';
    }

    sql += ' ORDER BY br.borrow_date DESC';
    const [rows] = await execute(sql, params);
    return rows;
  }

  // 根据ID查找借阅记录
  static async findById(id) {
    const sql = `SELECT br.*, u.username as user_name, b.title as book_title, b.author as book_author, b.isbn
                 FROM borrow_records br
                 JOIN users u ON br.user_id = u.id
                 JOIN books b ON br.book_id = b.id
                 WHERE br.id = ?`;
    const [rows] = await execute(sql, [id]);
    return rows[0];
  }

  // 归还图书
  static async returnBook(id) {
    const sql = `UPDATE borrow_records SET status = 'returned', return_date = NOW()
                 WHERE id = ?`;
    await execute(sql, [id]);
    return this.findById(id);
  }

  // 更新逾期状态
  static async updateOverdueStatus() {
    const sql = `UPDATE borrow_records SET status = 'overdue'
                 WHERE status = 'borrowed' AND due_date < CURDATE()`;
    const [result] = await execute(sql);
    return result.affectedRows;
  }

  // 获取用户当前借阅
  static async getUserBorrows(userId) {
    const sql = `SELECT br.*, b.title as book_title, b.author as book_author, b.isbn
                 FROM borrow_records br
                 JOIN books b ON br.book_id = b.id
                 WHERE br.user_id = ? AND br.status IN ('borrowed', 'overdue')
                 ORDER BY br.due_date ASC`;
    const [rows] = await execute(sql, [userId]);
    return rows;
  }

  // 获取借阅统计
  static async getBorrowStats() {
    const [rows] = await execute(`
      SELECT
        status,
        COUNT(*) as count
      FROM borrow_records
      GROUP BY status
    `);
    return rows;
  }

  // 删除记录
  static async delete(id) {
    const [result] = await execute('DELETE FROM borrow_records WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = BorrowRecord;
