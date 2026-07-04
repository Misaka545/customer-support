const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  mimeType: {
    type: String,
    default: '',
  },
  chunks: [{
    content: String,      
    chunkIndex: Number,    
    embedding: [Number],   
  }],
  totalChunks: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing',
  },
  errorMessage: {
    type: String,
    default: '',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
