const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String,
    enum: ['Bot', 'Agent', 'Customer', 'System'],
    required: true,
  },
  senderName: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'suggestion', 'file'],
    default: 'text',
  },
  suggestions: [{
    type: String,
  }],
}, {
  timestamps: true,
});

messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
