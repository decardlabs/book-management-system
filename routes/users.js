const express = require('express');
const User = require('../models/User');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有用户（管理员）
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({ error: '获取用户失败' });
  }
});

// 获取用户统计（管理员）
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const stats = await User.getUserStats();
    res.json(stats);
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取当前用户信息
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

// 更新用户信息
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // 用户只能修改自己的信息，或管理员可以修改任何人
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权修改该用户' });
    }

    // 普通用户不能修改角色
    const updateData = { ...req.body };
    if (req.user.role !== 'admin') {
      delete updateData.role;
    }

    const user = await User.update(req.params.id, updateData);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// 修改密码
router.put('/:id/password', verifyToken, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: '无权修改该用户密码' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    const user = await User.findByUsername(req.user.username);
    const isValid = await User.validatePassword(oldPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    await User.updatePassword(req.params.id, newPassword);
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 删除用户（管理员）
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    const success = await User.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
