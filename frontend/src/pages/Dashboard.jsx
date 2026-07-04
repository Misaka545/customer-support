import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    agentSocket.connect();

    return () => {
      agentSocket.disconnect();
    };
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/sessions', { params });
      setSessions(res.data.data.sessions);
    } catch (err) {
      console.error('Load sessions error:', err);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
    };

    const handleNewPending = ({ sessionId, customerName }) => {
      setNotification({
        message: `${t('newCustomer')} ${customerName || ''}`,
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

    agentSocket.on('receive_message', handleNewMessage);
    agentSocket.on('session_updated', handleSessionUpdated);
    agentSocket.on('new_pending_session', handleNewPending);
    agentSocket.on('session_accepted', handleSessionAccepted);

    return () => {
      agentSocket.off('receive_message', handleNewMessage);
      agentSocket.off('session_updated', handleSessionUpdated);
      agentSocket.off('new_pending_session', handleNewPending);
      agentSocket.off('session_accepted', handleSessionAccepted);
    };
  }, [loadSessions, selectedSession, t]);

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

  return (
    <div className="dashboard">
      {/* Notification toast */}
      {notification && (
        <div className="dashboard-notification" onClick={() => {
          setNotification(null);
        }}>
          <div className="notification-icon"></div>
          <div className="notification-text">{notification.message}</div>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="header-title">{t('appName')}</h1>
        </div>

        <div className="header-right">
          {/* Navigation links */}
          {isAdmin && (
            <a href="/knowledge" className="header-nav-link">
               {t('knowledgeBase')}
            </a>
          )}

          {/* Agent info */}
          <div className="header-agent">
            <div className="agent-avatar">
              {agent?.displayName?.charAt(0)?.toUpperCase()}
            </div>
            <span className="agent-name">{agent?.displayName}</span>
            <span className="agent-role-badge">{agent?.role === 'admin' ? t('admin') : t('agent')}</span>
          </div>

          <button className="header-logout" onClick={logout} title={t('logout')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
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
              <div className="empty-icon"></div>
              <h2>{t('selectConversation')}</h2>
              <p>{t('noConversations')}</p>
            </div>
          )}
        </div>

        {/* Customer info panel */}
        {selectedSession && (
          <CustomerInfo session={selectedSession} />
        )}
      </main>
    </div>
  );
}
