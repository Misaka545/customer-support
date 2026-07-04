const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/sessions
 * Tạo session mới cho khách hàng (public - không cần auth)
 */
router.post('/', async (req, res) => {
  try {
    const { customerName, metadata } = req.body;
    const sessionId = uuidv4();

    const session = await Session.create({
      sessionId,
      status: 'Bot_Handling',
      customerName: customerName || 'Khách hàng',
      metadata: metadata || {},
    });

    await Message.create({
      sessionId,
      sender: 'Bot',
      senderName: 'Trợ lý AI',
      content: 'Xin chào!  Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay? Nếu cần hỗ trợ từ nhân viên, hãy gõ "Gặp nhân viên" nhé!',
      messageType: 'text',
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo phiên chat. Vui lòng thử lại.',
    });
  }
});

/**
 * GET /api/sessions
 * Lấy danh sách sessions (Agent - cần auth)
 * Query params: ?status=Pending_Agent,In_Progress
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      const statuses = status.split(',');
      filter.status = { $in: statuses };
    }

    const sessions = await Session.find(filter)
      .populate('assignedAgent', 'displayName username')
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Lấy thông tin 1 session cụ thể
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId })
      .populate('assignedAgent', 'displayName username');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiên chat.',
      });
    }

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * PATCH /api/sessions/:sessionId/accept
 * Agent tiếp nhận session (chuyển từ Pending_Agent → In_Progress)
 */
router.patch('/:sessionId/accept', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      status: 'Pending_Agent',
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Phiên chat không tồn tại hoặc đã được tiếp nhận.',
      });
    }

    session.status = 'In_Progress';
    session.assignedAgent = req.agent._id;
    await session.save();

    await Message.create({
      sessionId: session.sessionId,
      sender: 'System',
      senderName: 'Hệ thống',
      content: `Nhân viên ${req.agent.displayName} đã tiếp nhận cuộc hội thoại.`,
      messageType: 'system',
    });

    await session.populate('assignedAgent', 'displayName username');

    res.json({
      success: true,
      message: 'Tiếp nhận phiên chat thành công!',
      data: { session },
    });
  } catch (error) {
    console.error('Accept session error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * PATCH /api/sessions/:sessionId/close
 * Đóng session
 */
router.patch('/:sessionId/close', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiên chat.',
      });
    }

    session.status = 'Closed';
    await session.save();

    await Message.create({
      sessionId: session.sessionId,
      sender: 'System',
      senderName: 'Hệ thống',
      content: 'Cuộc hội thoại đã được đóng. Cảm ơn bạn!',
      messageType: 'system',
    });

    res.json({
      success: true,
      message: 'Đã đóng phiên chat.',
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

module.exports = router;
