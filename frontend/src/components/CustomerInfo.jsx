import { useLanguage } from '../context/LanguageContext';
import './CustomerInfo.css';

export default function CustomerInfo({ session }) {
  const { t } = useLanguage();

  if (!session) return null;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColors = {
    Bot_Handling: '#4facfe',
    Pending_Agent: '#f5576c',
    In_Progress: '#43e97b',
    Closed: '#667085',
  };

  return (
    <aside className="customer-info">
      <h3 className="ci-title">{t('customerInfo')}</h3>

      <div className="ci-avatar-section">
        <div className="ci-avatar">
          {session.customerName?.charAt(0)?.toUpperCase() || 'K'}
        </div>
        <h4 className="ci-name">{session.customerName || 'Khách hàng'}</h4>
      </div>

      <div className="ci-details">
        <div className="ci-field">
          <label>{t('sessionId')}</label>
          <span className="ci-session-id">{session.sessionId?.substring(0, 8)}...</span>
        </div>

        <div className="ci-field">
          <label>{t('status')}</label>
          <span className="ci-status" style={{ color: statusColors[session.status] }}>
            ● {t(session.status === 'Bot_Handling' ? 'botHandling' :
              session.status === 'Pending_Agent' ? 'pending' :
              session.status === 'In_Progress' ? 'inProgress' : 'closed')}
          </span>
        </div>

        <div className="ci-field">
          <label>{t('createdAt')}</label>
          <span>{formatDate(session.createdAt)}</span>
        </div>

        <div className="ci-field">
          <label>{t('assignedTo')}</label>
          <span>
            {session.assignedAgent?.displayName || t('notAssigned')}
          </span>
        </div>

        {session.metadata?.page && (
          <div className="ci-field">
            <label>Trang đang xem</label>
            <span className="ci-page">{session.metadata.page}</span>
          </div>
        )}

        {session.metadata?.userAgent && (
          <div className="ci-field">
            <label>Trình duyệt</label>
            <span className="ci-ua">{session.metadata.userAgent?.substring(0, 40)}...</span>
          </div>
        )}
      </div>
    </aside>
  );
}
