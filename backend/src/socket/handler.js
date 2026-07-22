/**
 * Socket.io Event Handler
 * Quản lý real-time communication giữa Customer, Bot/AI, và Agent
 * Tích hợp Queue System cho phân bổ agent thông minh
 */
const Message = require('../models/Message');
const Session = require('../models/Session');
const Agent = require('../models/Agent');
const { processWithRAG, hasKnowledgeBase } = require('../services/rag');
const { processMessage: processBotMessage } = require('../services/bot');
const queue = require('../services/queue');

function setupSocketHandlers(io) {
  queue.setIO(io);

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

      const session = await Session.findOne({ sessionId });
      if (session && session.status === 'Pending_Agent' && session.queuePosition) {
        const totalInQueue = await Session.countDocuments({ status: 'Pending_Agent' });
        socket.emit('queue_position', {
          position: session.queuePosition,
          total: totalInQueue,
          estimatedWaitMinutes: session.queuePosition * 3,
        });
      }
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
          const handoffMessage = await Message.create({
            sessionId,
            sender: 'Bot',
            senderName: 'Trợ lý AI',
            content: result.response || 'Đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát... 🔄',
            messageType: 'suggestion',
            suggestions: result.suggestions || [],
          });

          customerNamespace.to(sessionId).emit('receive_message', handoffMessage);
          agentNamespace.emit('receive_message', handoffMessage);

          const queueResult = await queue.addToQueue(sessionId);

          if (queueResult.assigned) {
            const systemMessage = await Message.create({
              sessionId,
              sender: 'System',
              senderName: 'Hệ thống',
              content: `Nhân viên ${queueResult.agentName} đã tiếp nhận cuộc hội thoại. Bạn có thể trao đổi trực tiếp ngay bây giờ! 🎉`,
              messageType: 'system',
            });

            customerNamespace.to(sessionId).emit('receive_message', systemMessage);
            customerNamespace.to(sessionId).emit('agent_joined', { agentName: queueResult.agentName });

            agentNamespace.emit('receive_message', systemMessage);
            agentNamespace.emit('session_auto_assigned', {
              sessionId,
              agentId: queueResult.agentId,
              agentName: queueResult.agentName,
            });
            agentNamespace.emit('session_updated', { sessionId });

          } else {
            const waitingMessage = await Message.create({
              sessionId,
              sender: 'System',
              senderName: 'Hệ thống',
              content: `Tất cả nhân viên đang bận. Bạn đang ở vị trí #${queueResult.queuePosition} trong hàng đợi. Vui lòng đợi... ⏳`,
              messageType: 'system',
            });

            customerNamespace.to(sessionId).emit('receive_message', waitingMessage);
            customerNamespace.to(sessionId).emit('queue_position', {
              position: queueResult.queuePosition,
              total: queueResult.queuePosition,
              estimatedWaitMinutes: queueResult.queuePosition * 3,
            });

            agentNamespace.emit('new_pending_session', {
              sessionId,
              customerName: session.customerName,
              queuePosition: queueResult.queuePosition,
            });
            agentNamespace.emit('receive_message', waitingMessage);
            agentNamespace.emit('session_updated', { sessionId });
          }

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

    /**
     * Agent đi online — khai báo agentId và bắt đầu nhận sessions
     */
    socket.on('agent_online', async ({ agentId }) => {
      if (!agentId) return;
      socket.agentId = agentId;
      console.log(`🟢 Agent online: ${agentId}`);

      await queue.onAgentOnline(agentId);

      // Gửi queue status cho agent
      const queueStatus = await queue.getQueueStatus();
      socket.emit('queue_status', queueStatus);
    });

    /**
     * Agent thay đổi trạng thái (available/busy)
     */
    socket.on('agent_status_change', async ({ agentId, status }) => {
      if (!agentId || !['available', 'busy'].includes(status)) return;

      await Agent.findByIdAndUpdate(agentId, { agentStatus: status });

      if (status === 'available') {
        const result = await queue.assignNextInQueue();
        if (result) {
          const systemMessage = await Message.create({
            sessionId: result.sessionId,
            sender: 'System',
            senderName: 'Hệ thống',
            content: `Nhân viên ${result.agentName} đã tiếp nhận cuộc hội thoại. 🎉`,
            messageType: 'system',
          });

          customerNamespace.to(result.sessionId).emit('receive_message', systemMessage);
          customerNamespace.to(result.sessionId).emit('agent_joined', { agentName: result.agentName });
          customerNamespace.to(result.sessionId).emit('queue_position', { position: 0, total: 0 });

          agentNamespace.emit('session_auto_assigned', {
            sessionId: result.sessionId,
            agentId: result.agentId,
            agentName: result.agentName,
          });
          agentNamespace.emit('session_updated', { sessionId: result.sessionId });
        }
        await queue.updateQueuePositions();
      }

      agentNamespace.emit('agent_status_updated', { agentId, status });
    });

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

    /**
     * Agent tiếp nhận session thủ công (từ queue hoặc pending list)
     * Vẫn giữ cho trường hợp admin manually assign
     */
    socket.on('accept_session', async ({ sessionId, agentId, agentName }) => {
      try {
        const agent = await Agent.findById(agentId);
        if (!agent) {
          socket.emit('error_message', { message: 'Agent không tồn tại.' });
          return;
        }

        if (agent.currentActiveChats >= agent.maxConcurrentChats) {
          socket.emit('error_message', { 
            message: `Bạn đã đạt giới hạn ${agent.maxConcurrentChats} cuộc chat đồng thời.` 
          });
          return;
        }

        const session = await Session.findOneAndUpdate(
          { sessionId, status: 'Pending_Agent' },
          {
            status: 'In_Progress',
            assignedAgent: agentId,
            queuePosition: null,
            queuedAt: null,
          },
          { new: true }
        );

        if (!session) {
          socket.emit('error_message', { message: 'Phiên chat đã được tiếp nhận bởi agent khác.' });
          return;
        }

        await Agent.findByIdAndUpdate(agentId, {
          $inc: { currentActiveChats: 1 },
        });
        const updatedAgent = await Agent.findById(agentId);
        if (updatedAgent.currentActiveChats >= updatedAgent.maxConcurrentChats) {
          updatedAgent.agentStatus = 'busy';
          await updatedAgent.save();
        }
        queue.cancelQueueTimeout(sessionId);

        socket.join(sessionId);
        const systemMessage = await Message.create({
          sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: `Nhân viên ${agentName} đã tiếp nhận cuộc hội thoại. Bạn có thể trao đổi trực tiếp ngay bây giờ! 🎉`,
          messageType: 'system',
        });

        customerNamespace.to(sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(sessionId).emit('agent_joined', { agentName });
        customerNamespace.to(sessionId).emit('queue_position', { position: 0, total: 0 });
        agentNamespace.emit('receive_message', systemMessage);
        agentNamespace.emit('session_accepted', { sessionId, agentId, agentName });
        agentNamespace.emit('session_updated', { sessionId });
        await queue.updateQueuePositions();

      } catch (error) {
        console.error('Accept session error:', error);
        socket.emit('error_message', { message: 'Lỗi khi tiếp nhận.' });
      }
    });

    socket.on('close_session', async ({ sessionId }) => {
      try {
        await Session.findOneAndUpdate(
          { sessionId },
          { status: 'Closed', queuePosition: null }
        );

        const systemMessage = await Message.create({
          sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: 'Cuộc hội thoại đã được đóng. Cảm ơn bạn đã liên hệ! 🙏',
          messageType: 'system',
        });

        customerNamespace.to(sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(sessionId).emit('session_closed');
        agentNamespace.emit('receive_message', systemMessage);
        agentNamespace.emit('session_updated', { sessionId });

        const releaseResult = await queue.releaseSlot(sessionId);

        if (releaseResult.nextAssigned) {
          const next = releaseResult.nextAssigned;
          const assignMsg = await Message.create({
            sessionId: next.sessionId,
            sender: 'System',
            senderName: 'Hệ thống',
            content: `Nhân viên ${next.agentName} đã tiếp nhận cuộc hội thoại. 🎉`,
            messageType: 'system',
          });

          customerNamespace.to(next.sessionId).emit('receive_message', assignMsg);
          customerNamespace.to(next.sessionId).emit('agent_joined', { agentName: next.agentName });
          customerNamespace.to(next.sessionId).emit('queue_position', { position: 0, total: 0 });

          agentNamespace.emit('session_auto_assigned', {
            sessionId: next.sessionId,
            agentId: next.agentId,
            agentName: next.agentName,
          });
          agentNamespace.emit('session_updated', { sessionId: next.sessionId });
        }

      } catch (error) {
        console.error('Close session error:', error);
      }
    });

    /**
     * Lấy queue status (admin)
     */
    socket.on('get_queue_status', async () => {
      const status = await queue.getQueueStatus();
      socket.emit('queue_status', status);
    });

    socket.on('typing', ({ sessionId, agentName }) => {
      customerNamespace.to(sessionId).emit('agent_typing', { agentName });
    });

    socket.on('stop_typing', ({ sessionId }) => {
      customerNamespace.to(sessionId).emit('agent_stop_typing');
    });

    socket.on('disconnect', async () => {
      console.log(` Agent disconnected: ${socket.id}`);
      if (socket.agentId) {
        await queue.onAgentOffline(socket.agentId);
        agentNamespace.emit('agent_status_updated', { 
          agentId: socket.agentId, 
          status: 'offline' 
        });
      }
    });
  });
}

module.exports = { setupSocketHandlers };
