// models/Interview.js
const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  response: { type: String, default: '' },
  interviewType: { 
    type: String, 
    enum: ['technical', 'behavioral', 'system-design'], 
    default: 'technical' 
  },
  isRetry: { type: Boolean, default: false },
  originalInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);

