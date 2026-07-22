import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import './KnowledgeBase.css';

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
};

export default function KnowledgeBase() {
  const { agent, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await api.get('/knowledge');
      setDocuments(res.data.data.documents);
    } catch (err) {
      console.error('Load docs error:', err);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload thất bại');
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;

    try {
      await api.delete(`/knowledge/${id}`);
      loadDocuments();
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="kb-page">
      {/* Header - Unified Theme */}
      <motion.header
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="page-title">
          <BookOpen size={22} className="title-icon" /> {t('knowledgeBase') || 'Kho tri thức AI'}
        </h1>
      </motion.header>

      {/* Content */}
      <main className="kb-content">
        {/* Upload area */}
        {isAdmin && (
          <motion.div
            className={`kb-upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              style={{ display: 'none' }}
            />

            {uploading ? (
              <div className="kb-upload-loading">
                <div className="upload-spinner"></div>
                <p>Đang tải lên và xử lý tài liệu...</p>
              </div>
            ) : (
              <>
                <motion.div
                  className="kb-upload-icon"
                  animate={dragActive ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </motion.div>
                <p className="kb-upload-text">{t('dragDrop')}</p>
                <p className="kb-upload-hint">{t('supportedFormats')}</p>
              </>
            )}
          </motion.div>
        )}

        {/* Documents list */}
        <div className="kb-docs-section">
          <h2>{t('knowledgeBase')} ({documents.length})</h2>

          {documents.length === 0 ? (
            <motion.div
              className="kb-empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="kb-empty-icon">📚</div>
              <p>{t('noDocuments')}</p>
              <p className="kb-empty-sub">{t('uploadFirst')}</p>
            </motion.div>
          ) : (
            <div className="kb-docs-grid">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc._id}
                  className="kb-doc-card"
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -3 }}
                >
                  <div className="doc-icon">
                    {doc.mimeType?.includes('pdf') ? 'PDF' :
                     doc.mimeType?.includes('text') ? 'TXT' : 'DOC'}
                  </div>

                  <div className="doc-info">
                    <h4 className="doc-name">{doc.originalName}</h4>
                    <div className="doc-meta">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{doc.totalChunks} chunks</span>
                      <span>•</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.uploadedBy && (
                      <div className="doc-uploader">
                        {t('uploadedBy')}: {doc.uploadedBy.displayName}
                      </div>
                    )}
                  </div>

                  <div className="doc-status-actions">
                    <span className={`doc-status ${doc.status}`}>
                      {doc.status === 'ready' ? '✓ ' + t('ready') :
                       doc.status === 'processing' ? '⟳ ' + t('processing') :
                       '✕ ' + t('error')}
                    </span>
                    {doc.errorMessage && (
                      <span className="doc-error">{doc.errorMessage}</span>
                    )}
                    {isAdmin && (
                      <motion.button
                        className="doc-delete-btn"
                        onClick={() => handleDelete(doc._id)}
                        title={t('delete')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
