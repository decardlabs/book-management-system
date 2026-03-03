const { getPool } = require('../config/db');

function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

class Book {
  // 创建图书
  static async create(bookData) {
    const { isbn, title, author, publisher, publish_date, category, total_quantity, description } = bookData;
    const sql = `INSERT INTO books (isbn, title, author, publisher, publish_date, category, total_quantity, available_quantity, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await execute(sql, [isbn, title, author, publisher, publish_date, category, total_quantity, total_quantity, description]);
    return this.findById(result.insertId);
  }

  // 查找所有图书
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (filters.status) {
      if (filters.status === 'available') {
        sql += ' AND available_quantity > 0';
      } else if (filters.status === 'borrowed') {
        sql += ' AND available_quantity = 0';
      }
    }

    sql += ' ORDER BY created_at DESC';
    const [rows] = await execute(sql, params);
    return rows;
  }

  // 根据ID查找图书
  static async findById(id) {
    const [rows] = await execute('SELECT * FROM books WHERE id = ?', [id]);
    return rows[0];
  }

  // 根据ISBN查找图书
  static async findByISBN(isbn) {
    const [rows] = await execute('SELECT * FROM books WHERE isbn = ?', [isbn]);
    return rows[0];
  }

  // 更新图书
  static async update(id, bookData) {
    const { title, author, publisher, publish_date, category, total_quantity, description } = bookData;
    const current = await this.findById(id);
    const quantityDiff = total_quantity - current.total_quantity;

    const sql = `UPDATE books SET title = ?, author = ?, publisher = ?, publish_date = ?,
                 category = ?, total_quantity = ?, available_quantity = available_quantity + ?, description = ?
                 WHERE id = ?`;
    await execute(sql, [title, author, publisher, publish_date, category, total_quantity, quantityDiff, description, id]);
    return this.findById(id);
  }

  // 删除图书
  static async delete(id) {
    const [result] = await execute('DELETE FROM books WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 更新可用数量
  static async updateAvailableQuantity(id, change) {
    await execute('UPDATE books SET available_quantity = available_quantity + ? WHERE id = ?', [change, id]);
    return this.findById(id);
  }

  // 获取分类统计
  static async getCategoryStats() {
    const [rows] = await execute(`
      SELECT category, COUNT(*) as count, SUM(total_quantity) as total_books, SUM(available_quantity) as available_books
      FROM books
      GROUP BY category
    `);
    return rows;
  }
}

module.exports = Book;
