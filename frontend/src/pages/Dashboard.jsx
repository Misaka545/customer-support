import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Hourglass, User, AlertTriangle, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import CustomerInfo from '../components/CustomerInfo';
import agentSocket from '../services/socket';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { agent, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [notification, setNotification] = useState(null);

  const [agentStatus, setAgentStatus] = useState('available');
  const [workloadInfo, setWorkloadInfo] = useState({ active: 0, max: 5 });
  const [queueStatus, setQueueStatus] = useState(null);
  const [adminAlert, setAdminAlert] = useState(null);

  useEffect(() => {
    agentSocket.connect();

    const onConnect = () => {
      if (agent?.id) {
        agentSocket.emit('agent_online', { agentId: agent.id });
      }
    };

    agentSocket.on('connect', onConnect);

    if (agentSocket.connected && agent?.id) {
      agentSocket.emit('agent_online', { agentId: agent.id });
    }

    return () => {
      agentSocket.off('connect', onConnect);
      agentSocket.disconnect();
    };
  }, [agent?.id]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get('/sessions');
      let sessionList = res.data.data.sessions;

      if (!isAdmin) {
        sessionList = sessionList.filter(s =>
          s.assignedAgent?._id === agent?.id ||
          s.status === 'Pending_Agent' ||
          s.status === 'Bot_Handling'
        );
      }

      setSessions(sessionList);
    } catch (err) {
      console.error('Load sessions error:', err);
    }
  }, [agent?.id, isAdmin]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const loadWorkload = async () => {
      try {
        const res = await api.get('/auth/me');
        const agentData = res.data.data.agent;
        setWorkloadInfo({
          active: agentData.currentActiveChats || 0,
          max: agentData.maxConcurrentChats || 5,
        });
        setAgentStatus(agentData.agentStatus || 'available');
      } catch (err) {
        console.error('Load workload error:', err);
      }
    };
    loadWorkload();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadQueueStatus = async () => {
      try {
        const res = await api.get('/sessions/queue/status');
        setQueueStatus(res.data.data);
      } catch (err) {
        console.error('Queue status error:', err);
      }
    };
    loadQueueStatus();
    const interval = setInterval(loadQueueStatus, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadMessages = useCallback(async (sessionId) => {
    try {
      const res = await api.get(`/messages/${sessionId}`);
      setMessages(res.data.data.messages);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.sessionId);
      agentSocket.emit('join_session', { sessionId: selectedSession.sessionId });
    }
  }, [selectedSession, loadMessages]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    const handleSessionUpdated = () => {
      loadSessions();
      api.get('/auth/me').then(res => {
        const agentData = res.data.data.agent;
        setWorkloadInfo({
          active: agentData.currentActiveChats || 0,
          max: agentData.maxConcurrentChats || 5,
        });
        setAgentStatus(agentData.agentStatus || 'available');
      }).catch(() => {});
    };

    const handleNewPending = ({ sessionId, customerName, queuePosition }) => {
      setNotification({
        message: `${t('newCustomer')} ${customerName || ''} (#${queuePosition || '?'})`,
        sessionId,
      });
      setTimeout(() => setNotification(null), 5000);
      loadSessions();
    };

    const handleSessionAccepted = ({ sessionId }) => {
      loadSessions();
      if (selectedSession?.sessionId === sessionId) {
        api.get(`/sessions/${sessionId}`).then(res => {
          setSelectedSession(res.data.data.session);
        });
      }
    };

    const handleAutoAssigned = ({ sessionId, agentId, agentName }) => {
      if (agentId === agent?.id) {
        setNotification({
          message: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList size={16} /> {t('autoAssigned')}: {sessionId.slice(0, 8)}...</span>,
          sessionId,
        });
        setTimeout(() => setNotification(null), 5000);
      }
      loadSessions();
    };

    const handleQueueStatus = (status) => {
      setQueueStatus(status);
    };

    const handleAdminAlert = (alert) => {
      if (isAdmin) {
        setAdminAlert(alert);
        setTimeout(() => setAdminAlert(null), 10000);
      }
    };

    const handleAgentStatusUpdated = ({ agentId: aid, status }) => {
      if (aid === agent?.id) {
        setAgentStatus(status);
      }
    };

    agentSocket.on('receive_message', handleNewMessage);
    agentSocket.on('session_updated', handleSessionUpdated);
    agentSocket.on('new_pending_session', handleNewPending);
    agentSocket.on('session_accepted', handleSessionAccepted);
    agentSocket.on('session_auto_assigned', handleAutoAssigned);
    agentSocket.on('queue_status', handleQueueStatus);
    agentSocket.on('admin_alert', handleAdminAlert);
    agentSocket.on('agent_status_updated', handleAgentStatusUpdated);

    return () => {
      agentSocket.off('receive_message', handleNewMessage);
      agentSocket.off('session_updated', handleSessionUpdated);
      agentSocket.off('new_pending_session', handleNewPending);
      agentSocket.off('session_accepted', handleSessionAccepted);
      agentSocket.off('session_auto_assigned', handleAutoAssigned);
      agentSocket.off('queue_status', handleQueueStatus);
      agentSocket.off('admin_alert', handleAdminAlert);
      agentSocket.off('agent_status_updated', handleAgentStatusUpdated);
    };
  }, [loadSessions, selectedSession, t, agent?.id, isAdmin]);

  const handleSelectSession = (session) => {
    if (selectedSession) {
      agentSocket.emit('leave_session', { sessionId: selectedSession.sessionId });
    }
    setSelectedSession(session);
    setShowMobileChat(true);
  };

  const handleAcceptSession = async (sessionId) => {
    try {
      agentSocket.emit('accept_session', {
        sessionId,
        agentId: agent.id,
        agentName: agent.displayName,
      });
      await api.patch(`/sessions/${sessionId}/accept`);
      loadSessions();
      const res = await api.get(`/sessions/${sessionId}`);
      setSelectedSession(res.data.data.session);
    } catch (err) {
      console.error('Accept session error:', err);
    }
  };

  const handleSendMessage = (content) => {
    if (!selectedSession || !content.trim()) return;

    agentSocket.emit('send_message', {
      sessionId: selectedSession.sessionId,
      content: content.trim(),
      agentId: agent.id,
      agentName: agent.displayName,
    });
  };

  const handleCloseSession = async (sessionId) => {
    try {
      agentSocket.emit('close_session', { sessionId });
      await api.patch(`/sessions/${sessionId}/close`);
      loadSessions();
      if (selectedSession?.sessionId === sessionId) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error('Close session error:', err);
    }
  };

  const handleTyping = () => {
    if (selectedSession) {
      agentSocket.emit('typing', {
        sessionId: selectedSession.sessionId,
        agentName: agent.displayName,
      });
    }
  };

  const handleStopTyping = () => {
    if (selectedSession) {
      agentSocket.emit('stop_typing', {
        sessionId: selectedSession.sessionId,
      });
    }
  };

  const toggleAgentStatus = () => {
    const newStatus = agentStatus === 'available' ? 'busy' : 'available';
    setAgentStatus(newStatus);
    agentSocket.emit('agent_status_change', {
      agentId: agent.id,
      status: newStatus,
    });
  };

  return (
    <div className="dashboard">
      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className="dashboard-notification"
            onClick={() => setNotification(null)}
            initial={{ opacity: 0, x: 50, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="notification-text">{notification.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Alert */}
      <AnimatePresence>
        {adminAlert && (
          <motion.div
            className="dashboard-notification admin-alert"
            onClick={() => setAdminAlert(null)}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ top: notification ? '80px' : '20px' }}
          >
            <div className="notification-icon"><AlertTriangle size={18} /></div>
            <div className="notification-text">{adminAlert.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-title">
            <MessageSquare size={20} /> {t('conversations') || 'Chat'}
          </h1>
        </div>

        <div className="header-right">
          {/* Queue Monitor (Admin only) */}
          {isAdmin && queueStatus && (
            <div className="header-queue-monitor">
              <span className="queue-badge" title={t('queueMonitor')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Hourglass size={14} /> {queueStatus.totalInQueue || 0}
              </span>
              <span className="queue-agents" title={t('availableAgents')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} /> {queueStatus.availableAgents || 0}/{queueStatus.totalOnlineAgents || 0}
              </span>
            </div>
          )}

          {/* Workload indicator */}
          <div className="header-workload" title={t('workload')}>
            <div className="workload-bar">
              <motion.div
                className="workload-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(workloadInfo.active / workloadInfo.max) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  backgroundColor: workloadInfo.active >= workloadInfo.max ? '#EF4444' :
                    workloadInfo.active >= workloadInfo.max * 0.7 ? '#F59E0B' : '#10B981'
                }}
              />
            </div>
            <span className="workload-text">{workloadInfo.active}/{workloadInfo.max}</span>
          </div>

          {/* Agent status toggle */}
          <motion.button
            className={`header-status-toggle ${agentStatus}`}
            onClick={toggleAgentStatus}
            title={agentStatus === 'available' ? t('statusAvailable') : t('statusBusy')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className={`status-dot ${agentStatus}`}></span>
            {agentStatus === 'available' ? t('available') : t('busy')}
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Sidebar - Session list */}
        <Sidebar
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={handleSelectSession}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onAcceptSession={handleAcceptSession}
          isAdmin={isAdmin}
          queueStatus={queueStatus}
          agentId={agent?.id}
        />

        {/* Chat area */}
        <div className={`dashboard-chat ${showMobileChat ? 'show-mobile' : ''}`}>
          {selectedSession ? (
            <ChatBox
              session={selectedSession}
              messages={messages}
              onSendMessage={handleSendMessage}
              onAcceptSession={handleAcceptSession}
              onCloseSession={handleCloseSession}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              onBack={() => setShowMobileChat(false)}
              agentId={agent?.id}
            />
          ) : (
            <div className="dashboard-empty">
              <motion.div
                className="empty-icon"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2>{t('selectConversation')}</h2>
              <p>{t('noConversations')}</p>
            </div>
          )}
        </div>

        {/* Customer info panel */}
        <AnimatePresence>
          {selectedSession && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CustomerInfo session={selectedSession} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
