const express = require('express');
const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有借阅记录
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      status: req.query.status,
      overdue: req.query.overdue
    };

    const records = await BorrowRecord.findAll(filters);
    res.json(records);
  } catch (error) {
    console.error('获取借阅记录错误:', error);
    res.status(500).json({ error: '获取借阅记录失败' });
  }
});

// 获取当前用户的借阅记录
router.get('/my-borrows', verifyToken, async (req, res) => {
  try {
    const records = await BorrowRecord.getUserBorrows(req.user.id);
    res.json(records);
  } catch (error) {
    console.error('获取借阅记录错误:', error);
    res.status(500).json({ error: '获取借阅记录失败' });
  }
});

// 获取借阅统计（管理员）
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    await BorrowRecord.updateOverdueStatus();
    const stats = await BorrowRecord.getBorrowStats();
    res.json(stats);
  } catch (error) {
    console.error('获取借阅统计错误:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 借阅图书
router.post('/', verifyToken, async (req, res) => {
  try {
    const { book_id, due_days } = req.body;

    if (!book_id) {
      return res.status(400).json({ error: '图书ID不能为空' });
    }

    // 检查图书是否存在且有库存
    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    if (book.available_quantity <= 0) {
      return res.status(400).json({ error: '图书暂无库存' });
    }

    // 检查用户是否已借阅该书且未归还
    const userBorrows = await BorrowRecord.getUserBorrows(req.user.id);
    const hasBorrowed = userBorrows.some(b => b.book_id === parseInt(book_id));
    if (hasBorrowed) {
      return res.status(400).json({ error: '您已借阅此书，请先归还后再借阅' });
    }

    // 创建借阅记录
    const record = await BorrowRecord.create(req.user.id, book_id, due_days);

    // 减少可用库存
    await Book.updateAvailableQuantity(book_id, -1);

    res.status(201).json(record);
  } catch (error) {
    console.error('借阅图书错误:', error);
    res.status(500).json({ error: '借阅失败' });
  }
});

// 归还图书
router.put('/:id/return', verifyToken, async (req, res) => {
  try {
    const record = await BorrowRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }

    // 检查权限
    if (record.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权操作此借阅记录' });
    }

    if (record.status === 'returned') {
      return res.status(400).json({ error: '图书已归还' });
    }

    // 归还图书
    const returned = await BorrowRecord.returnBook(req.params.id);

    // 增加可用库存
    await Book.updateAvailableQuantity(record.book_id, 1);

    res.json(returned);
  } catch (error) {
    console.error('归还图书错误:', error);
    res.status(500).json({ error: '归还失败' });
  }
});

// 删除借阅记录（管理员）
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const success = await BorrowRecord.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '借阅记录不存在' });
    }
    res.json({ message: '借阅记录删除成功' });
  } catch (error) {
    console.error('删除借阅记录错误:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
