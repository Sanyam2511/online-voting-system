import mongoose from 'mongoose';

export const DISPUTE_TYPES = ['dispute', 'recount'];
export const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'rejected'];

const disputeStatusTimelineSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: DISPUTE_STATUSES,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false
});

const electionDisputeSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
    index: true
  },
  electionName: {
    type: String,
    default: 'National General Election 2026'
  },
  type: {
    type: String,
    enum: DISPUTE_TYPES,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000
  },
  receiptCode: {
    type: String,
    default: '',
    trim: true,
    uppercase: true,
    index: true
  },
  receipt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoteReceipt',
    default: null
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  },
  filedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filedByName: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: DISPUTE_STATUSES,
    default: 'open',
    index: true
  },
  resolutionNote: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  statusTimeline: {
    type: [disputeStatusTimelineSchema],
    default: []
  }
}, {
  timestamps: true
});

electionDisputeSchema.index({ filedBy: 1, election: 1, createdAt: -1 });
electionDisputeSchema.index({ status: 1, type: 1, createdAt: -1 });

const ElectionDispute = mongoose.model('ElectionDispute', electionDisputeSchema);
export default ElectionDispute;
