import mongoose from 'mongoose';

export const ELECTION_STATUSES = [
  'draft',
  'registration',
  'live',
  'counting',
  'audited',
  'published',
  'archived'
];

const electionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an election name'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: [true, 'Please add an election slug'],
    trim: true,
    lowercase: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ELECTION_STATUSES,
    default: 'draft',
    index: true
  },
  registrationStartsAt: {
    type: Date,
    default: null
  },
  registrationEndsAt: {
    type: Date,
    default: null
  },
  votingStartsAt: {
    type: Date,
    default: null
  },
  votingEndsAt: {
    type: Date,
    default: null
  },
  resultsPublishedAt: {
    type: Date,
    default: null
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

electionSchema.index({ status: 1, updatedAt: -1 });

const Election = mongoose.model('Election', electionSchema);
export default Election;
