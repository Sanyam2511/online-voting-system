import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    index: true,
    default: null
  },
  name: {
    type: String,
    required: [true, 'Please add a candidate name']
  },
  party: {
    type: String,
    required: [true, 'Please add a party name']
  },
  electionName: {
    type: String,
    default: 'National General Election 2026'
  },
  manifesto: {
    type: String,
    required: [true, 'Please add a manifesto or description']
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/150' // Fallback image
  },
  campaignTagline: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  region: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: null
  },
  education: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  priorities: {
    type: [String],
    default: []
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  voteCount: {
    type: Number,
    default: 0 
  }
}, {
  timestamps: true
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;