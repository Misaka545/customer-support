const express = require('express');
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Đăng nhập agent
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập username và password.',
      });
    }

    const agent = await Agent.findOne({ username }).select('+password');
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không đúng.',
      });
    }

    const isMatch = await agent.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không đúng.',
      });
    }

    agent.isOnline = true;
    await agent.save();

    const token = jwt.sign(
      { id: agent._id, role: agent.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        token,
        agent: {
          id: agent._id,
          username: agent.username,
          displayName: agent.displayName,
          role: agent.role,
          isOnline: agent.isOnline,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại.',
    });
  }
});

/**
 * POST /api/auth/register
 * Tạo agent mới (chỉ Admin)
 */
router.post('/register', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin: username, password, displayName.',
      });
    }

    const existingAgent = await Agent.findOne({ username });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Username đã tồn tại.',
      });
    }

    const agent = await Agent.create({
      username,
      password,
      displayName,
      role: role || 'agent',
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công!',
      data: { agent },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server. Vui lòng thử lại.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Đăng xuất agent
 */
router.post('/logout', auth, async (req, res) => {
  try {
    await Agent.findByIdAndUpdate(req.agent._id, { isOnline: false });

    res.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * GET /api/auth/me
 * Lấy thông tin agent hiện tại
 */
router.get('/me', auth, async (req, res) => {
  res.json({
    success: true,
    data: { agent: req.agent },
  });
});

/**
 * GET /api/auth/agents
 * Lấy danh sách agents (Admin only)
 */
router.get('/agents', auth, adminOnly, async (req, res) => {
  try {
    const agents = await Agent.find().select('-password');
    res.json({
      success: true,
      data: { agents },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

module.exports = router;
