/**
 * Socket.io Event Handler
 * Quản lý real-time communication giữa Customer, Bot/AI, và Agent
 */
const Message = require('../models/Message');
const Session = require('../models/Session');
const { processWithRAG, hasKnowledgeBase } = require('../services/rag');
const { processMessage: processBotMessage } = require('../services/bot');

function setupSocketHandlers(io) {
  const agentNamespace = io.of('/agent');
  const customerNamespace = io.of('/customer');

  /**
   * CUSTOMER SOCKET EVENTS
   */
  customerNamespace.on('connection', (socket) => {
    console.log(` Customer connected: ${socket.id}`);

    socket.on('join_session', async ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      socket.sessionId = sessionId;
      console.log(` Customer joined room: ${sessionId}`);
    });

    socket.on('send_message', async ({ sessionId, content }) => {
      if (!sessionId || !content) return;

      try {
        const customerMessage = await Message.create({
          sessionId,
          sender: 'Customer',
          senderName: 'Khách hàng',
          content,
          messageType: 'text',
        });

        await Session.findOneAndUpdate(
          { sessionId },
          { lastMessageAt: new Date(), $inc: { unreadCount: 1 } }
        );

        customerNamespace.to(sessionId).emit('receive_message', customerMessage);
        agentNamespace.to(sessionId).emit('receive_message', customerMessage);

        agentNamespace.emit('session_updated', { sessionId });

        const session = await Session.findOne({ sessionId });
        if (!session || session.status !== 'Bot_Handling') return;

        let result;
        const hasKB = await hasKnowledgeBase();
        if (hasKB && process.env.GEMINI_API_KEY) {
          const history = await Message.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
          result = await processWithRAG(content, history.reverse());
        } else {
          result = processBotMessage(content);
        }

        if (result.shouldHandoff) {
          await Session.findOneAndUpdate(
            { sessionId },
            { status: 'Pending_Agent' }
          );

          const handoffMessage = await Message.create({
            sessionId,
            sender: 'Bot',
            senderName: 'Trợ lý AI',
            content: result.response || 'Đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát... ',
            messageType: 'suggestion',
            suggestions: result.suggestions || [],
          });

          const systemMessage = await Message.create({
            sessionId,
            sender: 'System',
            senderName: 'Hệ thống',
            content: 'Đang tìm nhân viên hỗ trợ...',
            messageType: 'system',
          });

          customerNamespace.to(sessionId).emit('receive_message', handoffMessage);
          customerNamespace.to(sessionId).emit('receive_message', systemMessage);
          customerNamespace.to(sessionId).emit('handoff_initiated', {
            sessionId,
            suggestions: result.suggestions,
          });

          agentNamespace.emit('new_pending_session', {
            sessionId,
            customerName: session.customerName,
          });
          agentNamespace.emit('receive_message', handoffMessage);
          agentNamespace.emit('receive_message', systemMessage);
          agentNamespace.emit('session_updated', { sessionId });

        } else if (result.response) {
          const botMessage = await Message.create({
            sessionId,
            sender: 'Bot',
            senderName: 'Trợ lý AI',
            content: result.response,
            messageType: 'text',
          });

          customerNamespace.to(sessionId).emit('receive_message', botMessage);
          agentNamespace.to(sessionId).emit('receive_message', botMessage);
          agentNamespace.emit('session_updated', { sessionId });
        }

      } catch (error) {
        console.error('Socket send_message error:', error);
        socket.emit('error_message', { message: 'Không thể gửi tin nhắn.' });
      }
    });
    socket.on('disconnect', () => {
      console.log(` Customer disconnected: ${socket.id}`);
    });
  });

  /**
   * AGENT SOCKET EVENTS
   */
  agentNamespace.on('connection', (socket) => {
    console.log(` Agent connected: ${socket.id}`);

    socket.on('join_session', ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      console.log(`‍ Agent joined room: ${sessionId}`);
    });

    socket.on('leave_session', ({ sessionId }) => {
      if (!sessionId) return;
      socket.leave(sessionId);
      console.log(`‍ Agent left room: ${sessionId}`);
    });

    socket.on('send_message', async ({ sessionId, content, agentId, agentName }) => {
      if (!sessionId || !content) return;

      try {
        const agentMessage = await Message.create({
          sessionId,
          sender: 'Agent',
          senderName: agentName || 'Nhân viên',
          content,
          messageType: 'text',
        });

        await Session.findOneAndUpdate(
          { sessionId },
          { lastMessageAt: new Date(), unreadCount: 0 }
        );

        customerNamespace.to(sessionId).emit('receive_message', agentMessage);
        agentNamespace.to(sessionId).emit('receive_message', agentMessage);
        agentNamespace.emit('session_updated', { sessionId });

      } catch (error) {
        console.error('Agent send_message error:', error);
        socket.emit('error_message', { message: 'Không thể gửi tin nhắn.' });
      }
    });

    socket.on('accept_session', async ({ sessionId, agentId, agentName }) => {
      try {
        const session = await Session.findOneAndUpdate(
          { sessionId, status: 'Pending_Agent' },
          {
            status: 'In_Progress',
            assignedAgent: agentId,
          },
          { new: true }
        );

        if (!session) {
          socket.emit('error_message', { message: 'Phiên chat đã được tiếp nhận bởi agent khác.' });
          return;
        }
        socket.join(sessionId);
        const systemMessage = await Message.create({
          sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: `Nhân viên ${agentName} đã tiếp nhận cuộc hội thoại. Bạn có thể trao đổi trực tiếp ngay bây giờ! `,
          messageType: 'system',
        });

        customerNamespace.to(sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(sessionId).emit('agent_joined', { agentName });
        agentNamespace.emit('receive_message', systemMessage);
        agentNamespace.emit('session_accepted', { sessionId, agentId, agentName });
        agentNamespace.emit('session_updated', { sessionId });

      } catch (error) {
        console.error('Accept session error:', error);
        socket.emit('error_message', { message: 'Lỗi khi tiếp nhận.' });
      }
    });

    socket.on('close_session', async ({ sessionId }) => {
      try {
        await Session.findOneAndUpdate(
          { sessionId },
          { status: 'Closed' }
        );

        const systemMessage = await Message.create({
          sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: 'Cuộc hội thoại đã được đóng. Cảm ơn bạn đã liên hệ! ',
          messageType: 'system',
        });

        customerNamespace.to(sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(sessionId).emit('session_closed');
        agentNamespace.emit('receive_message', systemMessage);
        agentNamespace.emit('session_updated', { sessionId });

      } catch (error) {
        console.error('Close session error:', error);
      }
    });

    socket.on('typing', ({ sessionId, agentName }) => {
      customerNamespace.to(sessionId).emit('agent_typing', { agentName });
    });

    socket.on('stop_typing', ({ sessionId }) => {
      customerNamespace.to(sessionId).emit('agent_stop_typing');
    });

    socket.on('disconnect', () => {
      console.log(` Agent disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
