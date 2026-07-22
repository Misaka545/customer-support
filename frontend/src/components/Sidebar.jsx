import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Sidebar.css';

const STATUS_MAP = {
  Bot_Handling: { label: 'botHandling', color: '#7C5CFC', icon: '🤖' },
  Pending_Agent: { label: 'pending', color: '#EF4444', icon: '⏳' },
  In_Progress: { label: 'inProgress', color: '#10B981', icon: '💬' },
  Closed: { label: 'closed', color: '#9CA3AF', icon: '✅' },
};

export default function Sidebar({
  sessions,
  selectedSession,
  onSelectSession,
  statusFilter,
  onStatusFilterChange,
  onAcceptSession,
  isAdmin,
  queueStatus,
  agentId,
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.customerName?.toLowerCase().includes(query) ||
        s.sessionId?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [sessions, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { all: sessions.length };
    sessions.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [sessions]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}p`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>{t('conversations')}</h2>
        <motion.span
          className="sidebar-count"
          key={sessions.length}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          {sessions.length}
        </motion.span>
      </div>

      {/* Queue Status (Admin) */}
      <AnimatePresence>
        {isAdmin && queueStatus && queueStatus.totalInQueue > 0 && (
          <motion.div
            className="sidebar-queue-status"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="queue-status-header">
              <span className="queue-status-icon"><Clock size={14} /></span>
              <span>{t('queueMonitor')}</span>
            </div>
            <div className="queue-status-stats">
              <div className="queue-stat">
                <span className="stat-value">{queueStatus.totalInQueue}</span>
                <span className="stat-label">{t('totalInQueue')}</span>
              </div>
              <div className="queue-stat">
                <span className="stat-value">{queueStatus.averageWaitMinutes || 0}{t('minutes')}</span>
                <span className="stat-label">{t('avgWaitTime')}</span>
              </div>
              <div className="queue-stat">
                <span className="stat-value">{queueStatus.availableAgents || 0}</span>
                <span className="stat-label">{t('availableAgents')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="sidebar-search">
        <Search size={16} />
        <input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status filter tabs */}
      <div className="sidebar-tabs">
        <button
          className={statusFilter === 'all' ? 'active' : ''}
          onClick={() => onStatusFilterChange('all')}
        >
          {t('allSessions')}
          {statusCounts.all > 0 && <span className="tab-count">{statusCounts.all}</span>}
        </button>
        <button
          className={`${statusFilter === 'Pending_Agent' ? 'active' : ''} ${statusCounts.Pending_Agent ? 'has-pending' : ''}`}
          onClick={() => onStatusFilterChange('Pending_Agent')}
        >
          {t('pending')}
          {statusCounts.Pending_Agent > 0 && (
            <span className="tab-count pending">{statusCounts.Pending_Agent}</span>
          )}
        </button>
        <button
          className={statusFilter === 'In_Progress' ? 'active' : ''}
          onClick={() => onStatusFilterChange('In_Progress')}
        >
          {t('inProgress')}
          {statusCounts.In_Progress > 0 && <span className="tab-count">{statusCounts.In_Progress}</span>}
        </button>
      </div>

      {/* Session list */}
      <div className="sidebar-list">
        {filteredSessions.length === 0 ? (
          <div className="sidebar-empty">
            <p>{t('noConversations')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredSessions.map((session, index) => {
              const statusInfo = STATUS_MAP[session.status] || {};
              const isSelected = selectedSession?.sessionId === session.sessionId;
              const isAssignedToMe = session.assignedAgent?._id === agentId;

              return (
                <motion.div
                  key={session.sessionId}
                  className={`sidebar-item ${isSelected ? 'selected' : ''} ${isAssignedToMe ? 'assigned-to-me' : ''}`}
                  onClick={() => onSelectSession(session)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  layout
                  whileHover={{ x: 2 }}
                >
                  <div className="item-avatar">
                    <span>{session.customerName?.charAt(0)?.toUpperCase() || 'K'}</span>
                    <div
                      className="item-status-dot"
                      style={{ background: statusInfo.color }}
                    />
                  </div>

                  <div className="item-content">
                    <div className="item-top">
                      <span className="item-name">{session.customerName || 'Khách hàng'}</span>
                      <span className="item-time">{formatTime(session.lastMessageAt || session.updatedAt)}</span>
                    </div>
                    <div className="item-bottom">
                      <span className="item-status" style={{ color: statusInfo.color }}>
                        {statusInfo.icon} {t(statusInfo.label)}
                      </span>
                      {session.queuePosition && session.status === 'Pending_Agent' && (
                        <span className="item-queue-pos">#{session.queuePosition}</span>
                      )}
                      {session.unreadCount > 0 && (
                        <motion.span
                          className="item-unread"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          {session.unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>

                  {session.status === 'Pending_Agent' && (
                    <motion.button
                      className="item-accept-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptSession(session.sessionId);
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('accept')}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </aside>
  );
}
