import mongoose from 'mongoose';

const voteVerificationChallengeSchema = new mongoose.Schema({
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
  electionName: {
    type: String,
    default: 'National General Election 2026'
  },
  codeHash: {
    type: String,
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  consumedAt: {
    type: Date,
    default: null
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  maxAttempts: {
    type: Number,
    default: 5,
    min: 1
  }
}, {
  timestamps: true
});

voteVerificationChallengeSchema.index({ user: 1, election: 1 }, { unique: true });

const VoteVerificationChallenge = mongoose.model('VoteVerificationChallenge', voteVerificationChallengeSchema);
export default VoteVerificationChallenge;
