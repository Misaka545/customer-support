import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Edit2, Trash2, X, Plus, Eye, EyeOff, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import agentSocket from '../services/socket';
import CustomSelect from '../components/CustomSelect';
import CustomActionMenu from '../components/CustomActionMenu';
import { getAvatarUrl } from '../utils/avatar';
import './AgentManagement.css';

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
};

export default function AgentManagement() {
  const { agent: currentAgent } = useAuth();
  const { t } = useLanguage();
  const [agents, setAgents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const addAvatarInputRef = useRef(null);
  const editAvatarInputRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    avatar: '',
    role: 'agent',
    maxConcurrentChats: 5,
  });

  const [editData, setEditData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAgents = useCallback(async () => {
    try {
      const res = await api.get('/auth/agents');
      setAgents(res.data.data.agents);
    } catch (err) {
      console.error('Load agents error:', err);
    }
  }, []);

  // Realtime updates for Online/Offline agent statuses
  useEffect(() => {
    loadAgents();

    if (!agentSocket.connected) {
      agentSocket.connect();
    }

    const handleAgentStatusUpdate = () => {
      loadAgents();
    };

    agentSocket.on('agent_status_updated', handleAgentStatusUpdate);
    agentSocket.on('agent_online', handleAgentStatusUpdate);

    const interval = setInterval(() => {
      loadAgents();
    }, 5000);

    return () => {
      agentSocket.off('agent_status_updated', handleAgentStatusUpdate);
      agentSocket.off('agent_online', handleAgentStatusUpdate);
      clearInterval(interval);
    };
  }, [loadAgents]);

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    setUploadingAvatar(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/auth/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadingAvatar(false);
      return res.data.data.url;
    } catch (err) {
      setUploadingAvatar(false);
      console.error('Upload avatar file error:', err);
      setError(err.response?.data?.message || 'Không thể tải ảnh từ máy.');
      setTimeout(() => setError(''), 4000);
      return null;
    }
  };

  const handleAddAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleFileUpload(file);
    if (url) {
      setFormData(prev => ({ ...prev, avatar: url }));
      setSuccess('Đã tải ảnh lên thành công!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEditAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleFileUpload(file);
    if (url) {
      setEditData(prev => ({ ...prev, avatar: url }));
      setSuccess('Đã tải ảnh lên thành công!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', formData);
      setSuccess(t('success') || 'Tạo nhân viên thành công');
      setFormData({ username: '', password: '', displayName: '', avatar: '', role: 'agent', maxConcurrentChats: 5 });
      setShowAddForm(false);
      loadAgents();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || t('error') || 'Có lỗi xảy ra');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleUpdateAgent = async (agentId) => {
    setError('');
    try {
      await api.patch(`/auth/agents/${agentId}`, editData);
      setSuccess(t('success') || 'Cập nhật nhân viên thành công');
      setEditingAgent(null);
      setEditData({});
      loadAgents();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || t('error') || 'Có lỗi xảy ra');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm(t('deleteAgentConfirm') || 'Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
      await api.delete(`/auth/agents/${agentId}`);
      setSuccess(t('success') || 'Xóa tài khoản thành công');
      loadAgents();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || t('error') || 'Có lỗi xảy ra');
      setTimeout(() => setError(''), 4000);
    }
  };

  const startEdit = (agent) => {
    setEditingAgent(agent._id);
    setEditData({
      displayName: agent.displayName,
      username: agent.username,
      avatar: agent.avatar || '',
      password: '',
      role: agent.role,
      maxConcurrentChats: agent.maxConcurrentChats || 5,
    });
    setShowEditPassword(false);
  };

  const filteredAgents = agents.filter((ag) => {
    if (filter === 'online' && !ag.isOnline) return false;
    if (filter === 'offline' && ag.isOnline) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ag.displayName?.toLowerCase().includes(q) || ag.username?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="agent-mgmt-page">
      {/* Hidden File Inputs for Avatar Upload */}
      <input
        type="file"
        ref={addAvatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAddAvatarFile}
      />
      <input
        type="file"
        ref={editAvatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleEditAvatarFile}
      />

      {/* Header */}
      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="page-title">
          <Users size={22} className="title-icon" /> {t('agentManagement') || 'Quản lý nhân viên'}
        </h1>
        <motion.button
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={18} /> {t('addAgent') || 'Thêm nhân viên'}
        </motion.button>
      </motion.header>

      {/* Toolbar */}
      <div className="agent-toolbar">
        <div className="toolbar-search">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={filter === 'online' ? 'active' : ''} onClick={() => setFilter('online')}>Online</button>
          <button className={filter === 'offline' ? 'active' : ''} onClick={() => setFilter('offline')}>Offline</button>
        </div>
      </div>

      {/* Floating Toast Popups */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="alert-message error"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            className="alert-message success"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <CheckCircle size={18} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Agent Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-header">
                <h2>{t('addAgent') || 'Thêm nhân viên mới'}</h2>
                <button className="modal-close" onClick={() => setShowAddForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddAgent} className="agent-form">
                <div className="form-group">
                  <label>Tên hiển thị</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                    placeholder="Nhập tên hiển thị..."
                  />
                </div>

                <div className="form-group">
                  <label>Avatar (Upload từ máy hoặc nhập URL)</label>
                  <div className="avatar-upload-row">
                    <input
                      type="text"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                      placeholder="https://... hoặc bấm nút Upload"
                    />
                    <button
                      type="button"
                      className="btn-upload-file"
                      onClick={() => addAvatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload size={14} />
                      {uploadingAvatar ? 'Đang tải...' : 'Upload'}
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      minLength={3}
                      placeholder="username..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu</label>
                    <div className="input-with-eye">
                      <input
                        type={showAddPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                        placeholder="Mật khẩu..."
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setShowAddPassword(!showAddPassword)}
                      >
                        {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Vai trò (Role)</label>
                    <CustomSelect
                      options={[
                        { value: 'agent', label: t('agent') || 'Nhân viên' },
                        { value: 'admin', label: t('admin') || 'Quản trị viên' },
                      ]}
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sức chứa Chat (Max Chats)</label>
                    <input
                      type="number"
                      min="1" max="20"
                      value={formData.maxConcurrentChats}
                      onChange={(e) => setFormData({ ...formData, maxConcurrentChats: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Tạo tài khoản</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agents Grid */}
      <div className="agents-grid">
        {filteredAgents.map((ag, index) => (
          <motion.div
            key={ag._id}
            className={`agent-card ${ag._id === currentAgent?.id ? 'is-current' : ''}`}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3 }}
          >
            {editingAgent === ag._id ? (
              // Edit Mode
              <div className="agent-card-edit">
                <div className="edit-field">
                  <label className="edit-field-label">Tên hiển thị:</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.displayName || ''}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    placeholder="Tên hiển thị..."
                  />
                </div>

                <div className="edit-field">
                  <label className="edit-field-label">Avatar (Upload từ máy hoặc nhập URL):</label>
                  <div className="avatar-upload-row">
                    <input
                      type="text"
                      className="edit-input"
                      value={editData.avatar || ''}
                      onChange={(e) => setEditData({ ...editData, avatar: e.target.value })}
                      placeholder="https://... hoặc bấm nút Upload"
                    />
                    <button
                      type="button"
                      className="btn-upload-file"
                      onClick={() => editAvatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload size={13} />
                      {uploadingAvatar ? 'Đang tải...' : 'Upload'}
                    </button>
                  </div>
                </div>

                <div className="edit-field">
                  <label className="edit-field-label">Username:</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.username || ''}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    placeholder="Username..."
                  />
                </div>

                <div className="edit-field">
                  <label className="edit-field-label">Đổi mật khẩu:</label>
                  <div className="input-with-eye">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      className="edit-input"
                      value={editData.password || ''}
                      onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                      placeholder="Để trống nếu không đổi..."
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="edit-row">
                  <div className="edit-field flex-1">
                    <label className="edit-field-label">Vai trò:</label>
                    <CustomSelect
                      options={[
                        { value: 'agent', label: 'Agent' },
                        { value: 'admin', label: 'Admin' },
                      ]}
                      value={editData.role || 'agent'}
                      onChange={(val) => setEditData({ ...editData, role: val })}
                    />
                  </div>

                  <div className="edit-field small">
                    <label className="edit-field-label">Max Chats:</label>
                    <input
                      type="number"
                      className="edit-input"
                      min={1} max={20}
                      value={editData.maxConcurrentChats || 5}
                      onChange={(e) => setEditData({ ...editData, maxConcurrentChats: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="edit-actions">
                  <button className="btn-save" onClick={() => handleUpdateAgent(ag._id)}>Lưu</button>
                  <button className="btn-cancel" onClick={() => { setEditingAgent(null); setEditData({}); }}>Hủy</button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="card-header">
                  <div className="agent-identity">
                    <div className="agent-avatar-lg">
                      {ag.avatar && !imageErrors[ag._id] ? (
                        <img
                          src={getAvatarUrl(ag.avatar)}
                          alt={ag.displayName}
                          className="agent-avatar-img"
                          onError={() => handleImageError(ag._id)}
                        />
                      ) : (
                        ag.displayName?.charAt(0)?.toUpperCase()
                      )}
                      <span className={`status-dot-lg ${ag.isOnline ? (ag.agentStatus || 'available') : 'offline'}`}></span>
                    </div>
                    <div className="agent-info">
                      <h3>{ag.displayName}</h3>
                      <span className="agent-username">@{ag.username}</span>
                    </div>
                  </div>
                  <CustomActionMenu
                    items={[
                      {
                        label: 'Sửa',
                        icon: Edit2,
                        onClick: () => startEdit(ag),
                      },
                      ...(ag._id !== currentAgent?.id
                        ? [
                            {
                              label: 'Xóa',
                              icon: Trash2,
                              isDanger: true,
                              onClick: () => handleDeleteAgent(ag._id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">Vai trò:</span>
                    <span className={`role-badge ${ag.role}`}>
                      {ag.role === 'admin' ? 'Admin' : 'Agent'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Trạng thái:</span>
                    <span className={`status-text ${ag.isOnline ? (ag.agentStatus || 'available') : 'offline'}`}>
                      {ag.isOnline ? (ag.agentStatus === 'busy' ? 'Đang bận' : 'Online') : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="workload-section">
                    <div className="workload-header">
                      <span className="info-label">Khối lượng công việc:</span>
                      <span className="workload-count">{ag.currentActiveChats || 0} / {ag.maxConcurrentChats || 5}</span>
                    </div>
                    <div className="workload-progress">
                      <motion.div
                        className="workload-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${((ag.currentActiveChats || 0) / (ag.maxConcurrentChats || 5)) * 100}%` }}
                        transition={{ duration: 0.6, delay: index * 0.06 + 0.2 }}
                        style={{
                          backgroundColor:
                            (ag.currentActiveChats || 0) >= (ag.maxConcurrentChats || 5) ? '#EF4444' :
                            (ag.currentActiveChats || 0) >= (ag.maxConcurrentChats || 5) * 0.7 ? '#F59E0B' : '#10B981'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
