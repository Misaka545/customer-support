import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <motion.button
          className="chatbox-back"
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </motion.button>

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
            <motion.button
              className="chatbox-accept-btn"
              onClick={() => onAcceptSession(session.sessionId)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {t('acceptSession')}
            </motion.button>
          )}
          {(canChat || isPending) && (
            <motion.button
              className="chatbox-close-btn"
              onClick={() => onCloseSession(session.sessionId)}
              title={t('closeSession')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chatbox-messages">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chatbox-input-area">
        <AnimatePresence mode="wait">
          {isPending && (
            <motion.div
              className="chatbox-pending-notice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              ⏳ {t('acceptSession')} để bắt đầu chat
            </motion.div>
          )}
          {isClosed && (
            <motion.div
              className="chatbox-closed-notice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              ✅ Cuộc hội thoại đã đóng
            </motion.div>
          )}
          {(canChat || session?.status === 'Bot_Handling') && (
            <motion.div
              className="chatbox-input-wrapper"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={t('typeMessage')}
                rows={1}
                disabled={!canChat}
              />
              <motion.button
                className="chatbox-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || !canChat}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
