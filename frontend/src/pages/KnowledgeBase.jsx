import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import './KnowledgeBase.css';

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
      {/* Header */}
      <header className="kb-header">
        <div className="header-left">
          <a href="/" className="kb-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </a>
          <div className="header-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="header-title">{t('knowledgeBase')}</h1>
        </div>

        <div className="header-right">

          <div className="header-agent">
            <div className="agent-avatar">{agent?.displayName?.charAt(0)?.toUpperCase()}</div>
            <span className="agent-name">{agent?.displayName}</span>
          </div>
          <button className="header-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="kb-content">
        {/* Upload area */}
        {isAdmin && (
          <div
            className={`kb-upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
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
                <div className="kb-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="kb-upload-text">{t('dragDrop')}</p>
                <p className="kb-upload-hint">{t('supportedFormats')}</p>
              </>
            )}
          </div>
        )}

        {/* Documents list */}
        <div className="kb-docs-section">
          <h2>{t('knowledgeBase')} ({documents.length})</h2>

          {documents.length === 0 ? (
            <div className="kb-empty">
              <div className="kb-empty-icon">[!]</div>
              <p>{t('noDocuments')}</p>
              <p className="kb-empty-sub">{t('uploadFirst')}</p>
            </div>
          ) : (
            <div className="kb-docs-grid">
              {documents.map((doc) => (
                <div key={doc._id} className="kb-doc-card">
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
                      {doc.status === 'ready' ? '[OK] ' + t('ready') :
                       doc.status === 'processing' ? '[...] ' + t('processing') :
                       '[ERROR] ' + t('error')}
                    </span>
                    {doc.errorMessage && (
                      <span className="doc-error">{doc.errorMessage}</span>
                    )}
                    {isAdmin && (
                      <button
                        className="doc-delete-btn"
                        onClick={() => handleDelete(doc._id)}
                        title={t('delete')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
