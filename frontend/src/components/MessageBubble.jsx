import { motion } from 'framer-motion';
import './MessageBubble.css';

export default function MessageBubble({ message }) {
  const { sender, senderName, content, messageType, suggestions, createdAt } = message;

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // System message
  if (sender === 'System' || messageType === 'system') {
    return (
      <motion.div
        className="msg-system"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <span>{content}</span>
      </motion.div>
    );
  }

  const isCustomer = sender === 'Customer';
  const isBot = sender === 'Bot';

  return (
    <motion.div
      className={`msg-wrapper ${!isCustomer ? 'msg-right' : 'msg-left'}`}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {isCustomer && (
        <div className="msg-avatar msg-avatar-customer">
          {senderName?.charAt(0)?.toUpperCase() || 'K'}
        </div>
      )}

      <div className="msg-bubble-container">
        {isCustomer && (
          <span className="msg-sender-name">
            {senderName || 'Khách hàng'}
          </span>
        )}

        <div className={`msg-bubble ${isCustomer ? 'msg-customer' : isBot ? 'msg-bot' : 'msg-agent'}`}>
          <p className="msg-content">{content}</p>

          {/* Suggestion chips */}
          {messageType === 'suggestion' && suggestions?.length > 0 && (
            <div className="msg-suggestions">
              {suggestions.map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="msg-suggestion-chip"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.2 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <span className="msg-time">{formatTime(createdAt)}</span>
      </div>
    </motion.div>
  );
}
