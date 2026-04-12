import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a candidate name']
  },
  party: {
    type: String,
    required: [true, 'Please add a party name']
  },
  manifesto: {
    type: String,
    required: [true, 'Please add a manifesto or description']
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/150' // Fallback image
  },
  voteCount: {
    type: Number,
    default: 0 // Initializes with 0 votes
  }
}, {
  timestamps: true
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;