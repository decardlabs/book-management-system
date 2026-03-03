const express = require('express');
const Book = require('../models/Book');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有图书
router.get('/', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      category: req.query.category,
      status: req.query.status
    };

    const books = await Book.findAll(filters);
    res.json(books);
  } catch (error) {
    console.error('获取图书错误:', error);
    res.status(500).json({ error: '获取图书失败' });
  }
});

// 获取图书分类统计
router.get('/stats/category', verifyToken, isAdmin, async (req, res) => {
  try {
    const stats = await Book.getCategoryStats();
    res.json(stats);
  } catch (error) {
    console.error('获取分类统计错误:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 根据ID获取图书
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json(book);
  } catch (error) {
    console.error('获取图书错误:', error);
    res.status(500).json({ error: '获取图书失败' });
  }
});

// 添加图书（管理员）
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { isbn, title, author, publisher, publish_date, category, total_quantity, description } = req.body;

    if (!isbn || !title || !author) {
      return res.status(400).json({ error: 'ISBN、标题和作者不能为空' });
    }

    // 检查ISBN是否已存在
    const existingBook = await Book.findByISBN(isbn);
    if (existingBook) {
      return res.status(400).json({ error: 'ISBN已存在' });
    }

    const book = await Book.create({
      isbn, title, author, publisher, publish_date, category, total_quantity, description
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('添加图书错误:', error);
    res.status(500).json({ error: '添加图书失败' });
  }
});

// 更新图书（管理员）
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const book = await Book.update(req.params.id, req.body);
    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json(book);
  } catch (error) {
    console.error('更新图书错误:', error);
    res.status(500).json({ error: '更新图书失败' });
  }
});

// 删除图书（管理员）
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const success = await Book.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '图书不存在' });
    }
    res.json({ message: '图书删除成功' });
  } catch (error) {
    console.error('删除图书错误:', error);
    res.status(500).json({ error: '删除图书失败' });
  }
});

module.exports = router;
