const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const KnowledgeBase = require('../models/KnowledgeBase');
const { auth, adminOnly } = require('../middleware/auth');
const { processDocument } = require('../services/embedding');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ hỗ trợ file PDF, TXT, và DOCX.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

/**
 * POST /api/knowledge/upload
 * Upload tài liệu mới (Admin only)
 */
router.post('/upload', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file để upload.',
      });
    }

    const doc = await KnowledgeBase.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing',
      uploadedBy: req.agent._id,
    });

    processDocument(doc._id, req.file.path, req.file.mimetype)
      .then(() => {
        console.log(` Document processed: ${req.file.originalname}`);
      })
      .catch((err) => {
        console.error(` Document processing failed: ${err.message}`);
      });

    res.status(201).json({
      success: true,
      message: 'Tài liệu đang được xử lý. Vui lòng đợi...',
      data: { document: doc },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi upload tài liệu.',
    });
  }
});

/**
 * GET /api/knowledge
 * Danh sách tài liệu
 */
router.get('/', auth, async (req, res) => {
  try {
    const documents = await KnowledgeBase.find()
      .populate('uploadedBy', 'displayName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

/**
 * DELETE /api/knowledge/:id
 * Xóa tài liệu (Admin only)
 */
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const doc = await KnowledgeBase.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu.',
      });
    }

    const filePath = path.join(__dirname, '../../uploads', doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await KnowledgeBase.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Đã xóa tài liệu.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
});

module.exports = router;
