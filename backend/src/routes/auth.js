const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Agent = require('../models/Agent');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ upload file hình ảnh (JPG, PNG, WEBP, SVG)'), false);
    }
  },
});

/**
 * POST /api/auth/upload-avatar
 * Tải ảnh đại diện lên server (trả về URL)
 */
router.post('/upload-avatar', auth, avatarUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file được tải lên.' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Tải ảnh thành công!',
      data: { url: avatarUrl },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tải ảnh.' });
  }
});

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
    agent.agentStatus = 'available';
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
          agentStatus: agent.agentStatus,
          maxConcurrentChats: agent.maxConcurrentChats,
          currentActiveChats: agent.currentActiveChats,
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
    const { username, password, displayName, role, avatar } = req.body;

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
      avatar: avatar || '',
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
    await Agent.findByIdAndUpdate(req.agent._id, { 
      isOnline: false, 
      agentStatus: 'offline',
      currentActiveChats: 0,
    });

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

/**
 * PATCH /api/auth/agents/:id
 * Cập nhật thông tin agent (Admin only)
 * Body: { maxConcurrentChats, role, displayName }
 */
router.patch('/agents/:id', auth, adminOnly, async (req, res) => {
  try {
    const { maxConcurrentChats, role, displayName, username, password, avatar } = req.body;
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent không tồn tại.',
      });
    }

    if (username && username.toLowerCase() !== agent.username) {
      const existing = await Agent.findOne({ username: username.toLowerCase() });
      if (existing && existing._id.toString() !== agent._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Tên đăng nhập đã được sử dụng.',
        });
      }
      agent.username = username.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải từ 6 ký tự trở lên.',
        });
      }
      agent.password = password;
    }

    if (displayName) agent.displayName = displayName;
    if (role && ['admin', 'agent'].includes(role)) agent.role = role;
    if (avatar !== undefined) agent.avatar = avatar;

    if (maxConcurrentChats !== undefined) {
      const maxChats = parseInt(maxConcurrentChats);
      if (isNaN(maxChats) || maxChats < 1 || maxChats > 20) {
        return res.status(400).json({
          success: false,
          message: 'maxConcurrentChats phải từ 1 đến 20.',
        });
      }
      agent.maxConcurrentChats = maxChats;
    }

    await agent.save();

    res.json({
      success: true,
      message: 'Cập nhật thành công!',
      data: {
        agent: {
          _id: agent._id,
          username: agent.username,
          displayName: agent.displayName,
          role: agent.role,
          avatar: agent.avatar,
          isOnline: agent.isOnline,
          agentStatus: agent.agentStatus,
          maxConcurrentChats: agent.maxConcurrentChats,
          currentActiveChats: agent.currentActiveChats,
        },
      },
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * DELETE /api/auth/agents/:id
 * Xóa agent (Admin only)
 */
router.delete('/agents/:id', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.agent._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản của chính mình.',
      });
    }

    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent không tồn tại.',
      });
    }

    res.json({
      success: true,
      message: 'Xóa agent thành công!',
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

module.exports = router;
