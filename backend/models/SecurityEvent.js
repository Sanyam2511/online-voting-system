import mongoose from 'mongoose';

export const SECURITY_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

const securityEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    enum: ['verification', 'voting', 'access', 'admin', 'system'],
    default: 'system',
    index: true
  },
  severity: {
    type: String,
    enum: SECURITY_SEVERITIES,
    default: 'info',
    index: true
  },
  isAnomaly: {
    type: Boolean,
    default: false,
    index: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  actorRole: {
    type: String,
    default: ''
  },
  actorEmail: {
    type: String,
    default: ''
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    default: null,
    index: true
  },
  electionName: {
    type: String,
    default: ''
  },
  sourceIp: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ actor: 1, createdAt: -1 });
securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ isAnomaly: 1, severity: 1, createdAt: -1 });

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;
