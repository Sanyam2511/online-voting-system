import mongoose from 'mongoose';

const voteReceiptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
    index: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  receiptCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },
  electionName: {
    type: String,
    default: 'National General Election 2026'
  },
  status: {
    type: String,
    enum: ['pending', 'counted', 'rejected'],
    default: 'counted'
  }
}, {
  timestamps: true
});

voteReceiptSchema.index({ user: 1, election: 1 }, { unique: true });

const VoteReceipt = mongoose.model('VoteReceipt', voteReceiptSchema);
export default VoteReceipt;
