import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import './CustomerInfo.css';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } }
};

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
    Bot_Handling: '#7C5CFC',
    Pending_Agent: '#EF4444',
    In_Progress: '#10B981',
    Closed: '#9CA3AF',
  };

  return (
    <aside className="customer-info">
      <h3 className="ci-title">{t('customerInfo')}</h3>

      <motion.div
        className="ci-avatar-section"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="ci-avatar">
          {session.customerName?.charAt(0)?.toUpperCase() || 'K'}
        </div>
        <h4 className="ci-name">{session.customerName || 'Khách hàng'}</h4>
      </motion.div>

      <motion.div
        className="ci-details"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="ci-field" variants={itemVariants}>
          <label>{t('sessionId')}</label>
          <span className="ci-session-id">{session.sessionId?.substring(0, 8)}...</span>
        </motion.div>

        <motion.div className="ci-field" variants={itemVariants}>
          <label>{t('status')}</label>
          <span className="ci-status" style={{ color: statusColors[session.status] }}>
            ● {t(session.status === 'Bot_Handling' ? 'botHandling' :
              session.status === 'Pending_Agent' ? 'pending' :
              session.status === 'In_Progress' ? 'inProgress' : 'closed')}
          </span>
        </motion.div>

        <motion.div className="ci-field" variants={itemVariants}>
          <label>{t('createdAt')}</label>
          <span>{formatDate(session.createdAt)}</span>
        </motion.div>

        <motion.div className="ci-field" variants={itemVariants}>
          <label>{t('assignedTo')}</label>
          <span>
            {session.assignedAgent?.displayName || t('notAssigned')}
          </span>
        </motion.div>

        {session.metadata?.page && (
          <motion.div className="ci-field" variants={itemVariants}>
            <label>Trang đang xem</label>
            <span className="ci-page">{session.metadata.page}</span>
          </motion.div>
        )}

        {session.metadata?.userAgent && (
          <motion.div className="ci-field" variants={itemVariants}>
            <label>Trình duyệt</label>
            <span className="ci-ua">{session.metadata.userAgent?.substring(0, 40)}...</span>
          </motion.div>
        )}
      </motion.div>
    </aside>
  );
}
