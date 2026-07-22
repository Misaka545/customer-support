const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username phải có ít nhất 3 ký tự'],
  },
  password: {
    type: String,
    required: [true, 'Password là bắt buộc'],
    minlength: [6, 'Password phải có ít nhất 6 ký tự'],
    select: false, 
  },
  displayName: {
    type: String,
    required: [true, 'Tên hiển thị là bắt buộc'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'agent'],
    default: 'agent',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  agentStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
  },
  maxConcurrentChats: {
    type: Number,
    default: 5,
    min: 1,
    max: 20,
  },
  currentActiveChats: {
    type: Number,
    default: 0,
    min: 0,
  },
  avatar: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

agentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

agentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
agentSchema.methods.toJSON = function () {
  const agent = this.toObject();
  delete agent.password;
  return agent;
};

module.exports = mongoose.model('Agent', agentSchema);
