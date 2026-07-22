const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['Bot_Handling', 'Pending_Agent', 'In_Progress', 'Closed'],
    default: 'Bot_Handling',
    index: true,
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null,
  },
  customerName: {
    type: String,
    default: 'Khách hàng',
  },
  metadata: {
    userAgent: String,
    language: String,
    page: String,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    type: Number,
    default: 0,
  },
  queuePosition: {
    type: Number,
    default: null,
  },
  queuedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

sessionSchema.index({ status: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
