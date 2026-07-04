const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

/**
 * GET /api/messages/:sessionId
 * Lấy lịch sử tin nhắn theo sessionId (public - khách cũng cần xem)
 * Query params: ?limit=50&before=<messageId>
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(limit);

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải tin nhắn.',
    });
  }
});

module.exports = router;
