import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Sidebar.css';

const STATUS_MAP = {
  Bot_Handling: { label: 'botHandling', color: '#4facfe', icon: '[Bot]' },
  Pending_Agent: { label: 'pending', color: '#f5576c', icon: '[Wait]' },
  In_Progress: { label: 'inProgress', color: '#43e97b', icon: '[Chat]' },
  Closed: { label: 'closed', color: '#667085', icon: '[Done]' },
};

export default function Sidebar({
  sessions,
  selectedSession,
  onSelectSession,
  statusFilter,
  onStatusFilterChange,
  onAcceptSession,
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
        <span className="sidebar-count">{sessions.length}</span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
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
          filteredSessions.map((session) => {
            const statusInfo = STATUS_MAP[session.status] || {};
            const isSelected = selectedSession?.sessionId === session.sessionId;

            return (
              <div
                key={session.sessionId}
                className={`sidebar-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSession(session)}
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
                    {session.unreadCount > 0 && (
                      <span className="item-unread">{session.unreadCount}</span>
                    )}
                  </div>
                </div>

                {session.status === 'Pending_Agent' && (
                  <button
                    className="item-accept-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptSession(session.sessionId);
                    }}
                  >
                    {t('accept')}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
