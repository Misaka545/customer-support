/**
 * Queue Service
 * Quản lý hàng đợi khách hàng và phân bổ agent thông minh
 * 
 * Features:
 * - FIFO queue (First In, First Out)
 * - Auto-assign to least-loaded available agent
 * - Agent capacity management (maxConcurrentChats)
 * - Queue timeout (auto-close sau 10 phút)
 * - Admin notification khi không có agent online
 */
const Session = require('../models/Session');
const Agent = require('../models/Agent');
const Message = require('../models/Message');

// Queue timeout: 10 phút (ms)
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000;

const queueTimers = new Map();

let _io = null;

/**
 * Set socket.io instance (gọi từ handler.js)
 */
function setIO(io) {
  _io = io;
}

/**
 * Thêm session vào hàng đợi
 * @param {string} sessionId
 * @returns {object} { assigned, agentId, agentName, queuePosition }
 */
async function addToQueue(sessionId) {
  const session = await Session.findOne({ sessionId });
  if (!session) return { assigned: false, queuePosition: -1 };

  session.queuedAt = new Date();
  session.status = 'Pending_Agent';
  await session.save();
  const assignResult = await autoAssign(sessionId);
  if (assignResult.assigned) {
    return assignResult;
  }

  const position = await updateQueuePositions();
  const myPos = await Session.findOne({ sessionId }).lean();

  startQueueTimeout(sessionId);
  const onlineAgents = await Agent.countDocuments({ 
    agentStatus: { $in: ['available', 'busy'] } 
  });
  if (onlineAgents === 0) {
    notifyAdminNoAgents(sessionId, session.customerName);
  }

  return { 
    assigned: false, 
    queuePosition: myPos?.queuePosition || position,
  };
}

/**
 * Tự động gán session cho agent phù hợp nhất (least loaded)
 * @param {string} sessionId
 * @returns {object} { assigned, agentId, agentName }
 */
async function autoAssign(sessionId) {
  const availableAgent = await Agent.findOne({
    agentStatus: 'available',
    $expr: { $lt: ['$currentActiveChats', '$maxConcurrentChats'] },
  }).sort({ currentActiveChats: 1 });

  if (!availableAgent) {
    return { assigned: false };
  }
  const session = await Session.findOneAndUpdate(
    { sessionId, status: 'Pending_Agent' },
    { 
      status: 'In_Progress',
      assignedAgent: availableAgent._id,
      queuePosition: null,
      queuedAt: null,
    },
    { new: true }
  );

  if (!session) {
    return { assigned: false };
  }

  await Agent.findByIdAndUpdate(availableAgent._id, {
    $inc: { currentActiveChats: 1 },
  });

  const updatedAgent = await Agent.findById(availableAgent._id);
  if (updatedAgent.currentActiveChats >= updatedAgent.maxConcurrentChats) {
    updatedAgent.agentStatus = 'busy';
    await updatedAgent.save();
  }
  cancelQueueTimeout(sessionId);

  return {
    assigned: true,
    agentId: availableAgent._id.toString(),
    agentName: availableAgent.displayName,
  };
}

/**
 * Giải phóng slot khi agent đóng session
 * @param {string} sessionId
 * @returns {object} { freedAgentId, nextAssigned }
 */
async function releaseSlot(sessionId) {
  const session = await Session.findOne({ sessionId });
  if (!session || !session.assignedAgent) {
    return { freedAgentId: null, nextAssigned: null };
  }

  const agentId = session.assignedAgent;
  const agent = await Agent.findByIdAndUpdate(
    agentId,
    { $inc: { currentActiveChats: -1 } },
    { new: true }
  );
  if (agent && agent.agentStatus === 'busy' && 
      agent.currentActiveChats < agent.maxConcurrentChats) {
    agent.agentStatus = 'available';
    await agent.save();
  }
  const nextResult = await assignNextInQueue();

  return { 
    freedAgentId: agentId.toString(), 
    nextAssigned: nextResult,
  };
}

/**
 * Gán session tiếp theo trong queue cho agent available
 * @returns {object|null} { sessionId, agentId, agentName } hoặc null
 */
async function assignNextInQueue() {
  const nextSession = await Session.findOne({
    status: 'Pending_Agent',
  }).sort({ queuedAt: 1 });

  if (!nextSession) return null;

  const result = await autoAssign(nextSession.sessionId);
  if (result.assigned) {
    await updateQueuePositions();
    return {
      sessionId: nextSession.sessionId,
      ...result,
    };
  }

  return null;
}

/**
 * Cập nhật vị trí hàng đợi cho tất cả sessions pending
 * @returns {number} Tổng số sessions trong queue
 */
async function updateQueuePositions() {
  const pendingSessions = await Session.find({
    status: 'Pending_Agent',
  }).sort({ queuedAt: 1 });

  for (let i = 0; i < pendingSessions.length; i++) {
    pendingSessions[i].queuePosition = i + 1;
    await pendingSessions[i].save();
  }

  if (_io) {
    const customerNamespace = _io.of('/customer');
    for (const session of pendingSessions) {
      customerNamespace.to(session.sessionId).emit('queue_position', {
        position: session.queuePosition,
        total: pendingSessions.length,
        estimatedWaitMinutes: session.queuePosition * 3, // ~3 phút / customer
      });
    }
  }

  return pendingSessions.length;
}

/**
 * Lấy trạng thái queue
 * @returns {object} { totalInQueue, averageWaitMinutes, availableAgents }
 */
async function getQueueStatus() {
  const totalInQueue = await Session.countDocuments({ status: 'Pending_Agent' });
  const availableAgents = await Agent.countDocuments({
    agentStatus: 'available',
    $expr: { $lt: ['$currentActiveChats', '$maxConcurrentChats'] },
  });
  const busyAgents = await Agent.countDocuments({
    agentStatus: { $in: ['available', 'busy'] },
  });

  const pendingSessions = await Session.find({ 
    status: 'Pending_Agent', 
    queuedAt: { $ne: null } 
  });
  let avgWaitMs = 0;
  if (pendingSessions.length > 0) {
    const now = Date.now();
    const totalWait = pendingSessions.reduce((sum, s) => sum + (now - s.queuedAt.getTime()), 0);
    avgWaitMs = totalWait / pendingSessions.length;
  }

  return {
    totalInQueue,
    averageWaitMinutes: Math.ceil(avgWaitMs / 60000),
    availableAgents,
    totalOnlineAgents: busyAgents,
  };
}

/**
 * Queue timeout: tự động đóng session sau 10 phút chờ
 */
function startQueueTimeout(sessionId) {
  cancelQueueTimeout(sessionId);

  const timer = setTimeout(async () => {
    try {
      const session = await Session.findOne({ sessionId, status: 'Pending_Agent' });
      if (!session) return;
      session.status = 'Closed';
      session.queuePosition = null;
      await session.save();
      const systemMessage = await Message.create({
        sessionId,
        sender: 'System',
        senderName: 'Hệ thống',
        content: 'Rất tiếc, hiện tại không có nhân viên nào có thể hỗ trợ bạn. Vui lòng thử lại sau hoặc để lại tin nhắn, chúng tôi sẽ phản hồi sớm nhất có thể. 🙏',
        messageType: 'system',
      });
      if (_io) {
        const customerNamespace = _io.of('/customer');
        const agentNamespace = _io.of('/agent');
        customerNamespace.to(sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(sessionId).emit('session_closed');
        customerNamespace.to(sessionId).emit('queue_timeout');
        agentNamespace.emit('session_updated', { sessionId });
      }

      await updateQueuePositions();

      queueTimers.delete(sessionId);
      console.log(` Queue timeout: session ${sessionId} auto-closed after 10 minutes`);
    } catch (error) {
      console.error('Queue timeout error:', error);
    }
  }, QUEUE_TIMEOUT_MS);

  queueTimers.set(sessionId, timer);
}

/**
 * Cancel queue timeout timer
 */
function cancelQueueTimeout(sessionId) {
  const timer = queueTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    queueTimers.delete(sessionId);
  }
}

/**
 * Thông báo cho admin khi không có agent online
 */
function notifyAdminNoAgents(sessionId, customerName) {
  if (!_io) return;

  const agentNamespace = _io.of('/agent');
  agentNamespace.emit('admin_alert', {
    type: 'no_agents_online',
    message: `⚠️ Không có nhân viên nào online! Khách hàng "${customerName || 'Khách hàng'}" đang chờ hỗ trợ.`,
    sessionId,
    timestamp: new Date(),
  });
}

/**
 * Agent đi online — kiểm tra queue và auto-assign
 * @param {string} agentId
 */
async function onAgentOnline(agentId) {
  const agent = await Agent.findByIdAndUpdate(
    agentId,
    { agentStatus: 'available', isOnline: true },
    { new: true }
  );

  if (!agent) return;

  let assigned = true;
  while (assigned) {
    const currentAgent = await Agent.findById(agentId);
    if (currentAgent.currentActiveChats >= currentAgent.maxConcurrentChats) {
      break;
    }

    const result = await assignNextInQueue();
    if (!result) break;

    if (_io) {
      const agentNamespace = _io.of('/agent');
      const customerNamespace = _io.of('/customer');

      const systemMessage = await Message.create({
        sessionId: result.sessionId,
        sender: 'System',
        senderName: 'Hệ thống',
        content: `Nhân viên ${result.agentName} đã tiếp nhận cuộc hội thoại. Bạn có thể trao đổi trực tiếp ngay bây giờ! 🎉`,
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
  }

  await updateQueuePositions();
}

/**
 * Agent đi offline — reassign sessions nếu cần
 * @param {string} agentId
 */
async function onAgentOffline(agentId) {
  await Agent.findByIdAndUpdate(agentId, {
    agentStatus: 'offline',
    isOnline: false,
    currentActiveChats: 0,
  });

  const activeSessions = await Session.find({
    assignedAgent: agentId,
    status: 'In_Progress',
  });

  for (const session of activeSessions) {
    session.status = 'Pending_Agent';
    session.assignedAgent = null;
    session.queuedAt = new Date();
    await session.save();

    const result = await autoAssign(session.sessionId);

    if (_io) {
      const customerNamespace = _io.of('/customer');
      const agentNamespace = _io.of('/agent');

      if (result.assigned) {
        const systemMessage = await Message.create({
          sessionId: session.sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: `Nhân viên ${result.agentName} sẽ tiếp tục hỗ trợ bạn. 🔄`,
          messageType: 'system',
        });
        customerNamespace.to(session.sessionId).emit('receive_message', systemMessage);
        customerNamespace.to(session.sessionId).emit('agent_joined', { agentName: result.agentName });
      } else {
        const systemMessage = await Message.create({
          sessionId: session.sessionId,
          sender: 'System',
          senderName: 'Hệ thống',
          content: 'Nhân viên hỗ trợ đã ngắt kết nối. Đang tìm nhân viên khác cho bạn...',
          messageType: 'system',
        });
        customerNamespace.to(session.sessionId).emit('receive_message', systemMessage);
        startQueueTimeout(session.sessionId);
      }

      agentNamespace.emit('session_updated', { sessionId: session.sessionId });
    }
  }

  await updateQueuePositions();
}

module.exports = {
  setIO,
  addToQueue,
  autoAssign,
  releaseSlot,
  assignNextInQueue,
  updateQueuePositions,
  getQueueStatus,
  onAgentOnline,
  onAgentOffline,
  startQueueTimeout,
  cancelQueueTimeout,
};
