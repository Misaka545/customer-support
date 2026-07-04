import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import MessageBubble from './MessageBubble';
import './ChatBox.css';

export default function ChatBox({
  session,
  messages,
  onSendMessage,
  onAcceptSession,
  onCloseSession,
  onTyping,
  onStopTyping,
  onBack,
  agentId,
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.sessionId]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    onStopTyping?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);

    onTyping?.();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.();
    }, 2000);
  };

  const canChat = session?.status === 'In_Progress' &&
    session?.assignedAgent?._id === agentId;
  const isPending = session?.status === 'Pending_Agent';
  const isClosed = session?.status === 'Closed';

  return (
    <div className="chatbox">
      {/* Chat Header */}
      <div className="chatbox-header">
        <button className="chatbox-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>

        <div className="chatbox-header-info">
          <h3>{session?.customerName || 'Khách hàng'}</h3>
          <span className={`chatbox-status status-${session?.status?.toLowerCase()}`}>
            {t(session?.status === 'Bot_Handling' ? 'botHandling' :
              session?.status === 'Pending_Agent' ? 'pending' :
              session?.status === 'In_Progress' ? 'inProgress' : 'closed')}
          </span>
        </div>

        <div className="chatbox-header-actions">
          {isPending && (
            <button
              className="chatbox-accept-btn"
              onClick={() => onAcceptSession(session.sessionId)}
            >
              [+] {t('acceptSession')}
            </button>
          )}
          {(canChat || isPending) && (
            <button
              className="chatbox-close-btn"
              onClick={() => onCloseSession(session.sessionId)}
              title={t('closeSession')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chatbox-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chatbox-input-area">
        {isPending && (
          <div className="chatbox-pending-notice">
            [Wait] {t('acceptSession')} để bắt đầu chat
          </div>
        )}
        {isClosed && (
          <div className="chatbox-closed-notice">
            [Done] Cuộc hội thoại đã đóng
          </div>
        )}
        {(canChat || session?.status === 'Bot_Handling') && (
          <div className="chatbox-input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t('typeMessage')}
              rows={1}
              disabled={!canChat}
            />
            <button
              className="chatbox-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || !canChat}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
