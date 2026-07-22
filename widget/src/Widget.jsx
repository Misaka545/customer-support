import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './Widget.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function Widget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);

  // Queue state
  const [queueInfo, setQueueInfo] = useState(null); // { position, total, estimatedWaitMinutes }

  // Khởi tạo session
  const initSession = useCallback(async () => {
    let sid = localStorage.getItem('cskh-session-id');

    if (sid) {
      // Session đã tồn tại → load lại lịch sử
      try {
        const res = await axios.get(`${API_URL}/messages/${sid}`);
        setMessages(res.data.data.messages);
        setSessionId(sid);
        return sid;
      } catch {
        // Session không còn hợp lệ → tạo mới
        localStorage.removeItem('cskh-session-id');
      }
    }

    // Tạo session mới
    try {
      const res = await axios.post(`${API_URL}/sessions`, {
        customerName: 'Khách hàng',
        metadata: {
          page: window.location.href,
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
      });
      sid = res.data.data.sessionId;
      localStorage.setItem('cskh-session-id', sid);
      setSessionId(sid);

      // Load welcome message
      const msgRes = await axios.get(`${API_URL}/messages/${sid}`);
      setMessages(msgRes.data.data.messages);

      return sid;
    } catch (err) {
      console.error('Init session error:', err);
      return null;
    }
  }, []);

  // Socket connection
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/customer`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (sessionId) {
        socket.emit('join_session', { sessionId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('receive_message', (message) => {
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      if (!isOpen) {
        setHasNewMessage(true);
      }
    });

    socket.on('agent_typing', () => setAgentTyping(true));
    socket.on('agent_stop_typing', () => setAgentTyping(false));

    socket.on('agent_joined', ({ agentName }) => {
      setAgentTyping(false);
      // Agent joined → clear queue
      setQueueInfo(null);
    });

    socket.on('session_closed', () => {
      setQueueInfo(null);
    });

    socket.on('handoff_initiated', ({ suggestions }) => {
      // Suggestions đã được gửi qua message
    });

    // Queue position updates
    socket.on('queue_position', ({ position, total, estimatedWaitMinutes }) => {
      if (position === 0) {
        setQueueInfo(null); // Assigned — no longer in queue
      } else {
        setQueueInfo({ position, total, estimatedWaitMinutes });
      }
    });

    // Queue timeout
    socket.on('queue_timeout', () => {
      setQueueInfo(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, isOpen]);

  // Join room khi có sessionId
  useEffect(() => {
    if (sessionId && socketRef.current?.connected) {
      socketRef.current.emit('join_session', { sessionId });
    }
  }, [sessionId]);

  // Init session khi mở widget
  useEffect(() => {
    if (isOpen && !sessionId) {
      initSession();
    }
  }, [isOpen, sessionId, initSession]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || !sessionId) return;

    socketRef.current?.emit('send_message', {
      sessionId,
      content: input.trim(),
    });

    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!sessionId) return;
    socketRef.current?.emit('send_message', {
      sessionId,
      content: suggestion,
    });
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="csai-widget">
      {/* Chat Window */}
      <div className={`csai-window ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="csai-header">
          <div className="csai-header-info">
            <div className="csai-header-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3>Hỗ trợ trực tuyến</h3>
              <span className={`csai-status ${isConnected ? 'online' : ''}`}>
                {isConnected ? 'Đang hoạt động' : 'Đang kết nối...'}
              </span>
            </div>
          </div>
          <button className="csai-close" onClick={toggleWidget}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
        </div>

        {/* Queue Banner */}
        {queueInfo && (
          <div className="csai-queue-banner">
            <div className="csai-queue-icon">
              <div className="queue-spinner"></div>
            </div>
            <div className="csai-queue-info">
              <span className="csai-queue-position">
                Vị trí #{queueInfo.position} trong hàng đợi
              </span>
              <span className="csai-queue-wait">
                Thời gian chờ dự kiến: ~{queueInfo.estimatedWaitMinutes} phút
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="csai-messages">
          {messages.map((msg) => {
            const isCustomer = msg.sender === 'Customer';
            const isSystem = msg.sender === 'System' || msg.messageType === 'system';

            if (isSystem) {
              return (
                <div key={msg._id} className="csai-msg-system">
                  {msg.content}
                </div>
              );
            }

            return (
              <div key={msg._id} className={`csai-msg ${isCustomer ? 'csai-msg-right' : 'csai-msg-left'}`}>
                {!isCustomer && (
                  <div className="csai-msg-avatar">
                    {msg.sender === 'Bot' ? 'Bot' : 'Agent'}
                  </div>
                )}
                <div className={`csai-msg-bubble ${isCustomer ? 'customer' : msg.sender === 'Bot' ? 'bot' : 'agent'}`}>
                  <p>{msg.content}</p>

                  {/* Suggestion chips */}
                  {msg.messageType === 'suggestion' && msg.suggestions?.length > 0 && (
                    <div className="csai-suggestions">
                      <p className="csai-suggestions-label">Bạn có thể hỏi:</p>
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          className="csai-suggestion-btn"
                          onClick={() => handleSuggestionClick(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="csai-msg-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {agentTyping && (
            <div className="csai-msg csai-msg-left">
              <div className="csai-msg-avatar">Agent</div>
              <div className="csai-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="csai-input-area">
          <div className="csai-input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              rows={1}
            />
            <button
              className="csai-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
          <div className="csai-powered">
            Powered by CSKH
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <button className={`csai-fab ${isOpen ? 'open' : ''}`} onClick={toggleWidget}>
        {hasNewMessage && !isOpen && <span className="csai-fab-badge"></span>}
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
