const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Agent = require('../models/Agent');
const { auth, adminOnly } = require('../middleware/auth');
const queue = require('../services/queue');

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
 * GET /api/sessions/queue/status
 * Lấy trạng thái hàng đợi (Admin)
 */
router.get('/queue/status', auth, async (req, res) => {
  try {
    const status = await queue.getQueueStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * GET /api/sessions/analytics/overview
 * Lấy số liệu thống kê tổng quan (Admin)
 */
router.get('/analytics/overview', auth, adminOnly, async (req, res) => {
  try {
    const queueStatus = await queue.getQueueStatus();
    
    // Thống kê trạng thái sessions
    const statusCounts = await Session.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    let totalSessions = 0;
    let pendingSessions = 0;
    let inProgressSessions = 0;
    let closedSessions = 0;
    let botHandling = 0;

    statusCounts.forEach(item => {
      totalSessions += item.count;
      if (item._id === 'Pending_Agent') pendingSessions = item.count;
      else if (item._id === 'In_Progress') inProgressSessions = item.count;
      else if (item._id === 'Closed') closedSessions = item.count;
      else if (item._id === 'Bot_Handling') botHandling = item.count;
    });

    const totalAgents = await Agent.countDocuments();
    const onlineAgents = await Agent.countDocuments({ isOnline: true });

    // Thống kê 7 ngày gần nhất từ database thực tế
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const dailySessions = await Session.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;
      const yearNum = d.getFullYear();

      let total = 0;
      let closed = 0;
      let botHandled = 0;
      let inProgress = 0;

      dailySessions.forEach((item) => {
        if (item._id.day === dayNum && item._id.month === monthNum && item._id.year === yearNum) {
          total += item.count;
          if (item._id.status === 'Closed') closed += item.count;
          else if (item._id.status === 'Bot_Handling') botHandled += item.count;
          else if (item._id.status === 'In_Progress') inProgress += item.count;
        }
      });

      return {
        name: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        total,
        closed,
        botHandled,
        inProgress,
      };
    });

    res.json({
      success: true,
      data: {
        metrics: {
          totalSessions,
          pendingSessions,
          inProgressSessions,
          closedSessions,
          botHandling,
          totalAgents,
          onlineAgents,
          totalInQueue: queueStatus.totalInQueue,
          avgWaitMinutes: queueStatus.averageWaitMinutes,
        },
        chartData: last7DaysData,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
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
