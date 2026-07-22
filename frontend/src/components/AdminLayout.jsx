import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';
import './AdminLayout.css';

function NavItemWithTooltip({ to, end, title, children }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      title=""
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            className="nav-item-tooltip"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            {title}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );
}

export default function AdminLayout({ children }) {
  const { agent, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowProfilePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="admin-layout">
      {/* Global Sidebar Navigation */}
      <aside className="global-sidebar">
        <motion.div
          className="global-sidebar-logo"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </motion.div>

        <nav className="global-sidebar-nav">
          <NavItemWithTooltip to="/" end title={t('dashboard') || 'Cuộc hội thoại'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </NavItemWithTooltip>

          {isAdmin && (
            <>
              {/* Analytics renamed to "Số liệu" */}
              <NavItemWithTooltip to="/analytics" title="Số liệu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </NavItemWithTooltip>

              <NavItemWithTooltip to="/agents" title={t('agentManagement') || 'Nhân viên'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </NavItemWithTooltip>

              <NavItemWithTooltip to="/knowledge" title={t('knowledgeBase') || 'Tri thức'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </NavItemWithTooltip>
            </>
          )}
        </nav>

        {/* Global Sidebar Bottom with Account Popup Trigger */}
        <div className="global-sidebar-bottom" ref={popupRef}>
          <motion.div
            className="nav-avatar"
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {agent?.avatar && !avatarError ? (
              <img
                src={getAvatarUrl(agent.avatar)}
                alt={agent.displayName}
                className="nav-avatar-img"
                onError={() => setAvatarError(true)}
              />
            ) : (
              agent?.displayName?.charAt(0)?.toUpperCase()
            )}
          </motion.div>

          {/* Account Profile Popup */}
          <AnimatePresence>
            {showProfilePopup && (
              <motion.div
                className="profile-popover"
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="profile-popover-header">
                  <div className="profile-avatar-container">
                    <div className="profile-avatar-lg">
                      {agent?.avatar && !avatarError ? (
                        <img
                          src={getAvatarUrl(agent.avatar)}
                          alt={agent.displayName}
                          className="profile-avatar-img"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        agent?.displayName?.charAt(0)?.toUpperCase()
                      )}
                    </div>
                    <span className="profile-status-dot online"></span>
                  </div>
                  <div className="profile-details">
                    <h4>{agent?.displayName}</h4>
                    <span className="profile-username">@{agent?.username}</span>
                    <span className={`profile-role-badge ${agent?.role}`}>
                      {agent?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                    </span>
                  </div>
                </div>

                <div className="profile-popover-divider"></div>

                <button className="profile-logout-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <motion.div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
