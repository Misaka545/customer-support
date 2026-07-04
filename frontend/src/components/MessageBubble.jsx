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
      <div className="msg-system">
        <span>{content}</span>
      </div>
    );
  }

  const isCustomer = sender === 'Customer';
  const isBot = sender === 'Bot';

  return (
    <div className={`msg-wrapper ${!isCustomer ? 'msg-right' : 'msg-left'}`}>
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
                <button key={i} className="msg-suggestion-chip">
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="msg-time">{formatTime(createdAt)}</span>
      </div>
    </div>
  );
}
