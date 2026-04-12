import Candidate from '../models/Candidate.js';
import User from '../models/User.js';

// @desc Get all candidates
export const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({}).select('-__v');
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Cast a vote
export const castVote = async (req, res) => {
  const { candidateId } = req.body;
  const userId = req.user.id;

  try {
    // 1. Double check if user has already voted
    const user = await User.findById(userId);
    if (user.hasVoted) {
      return res.status(400).json({ message: 'You have already cast your vote.' });
    }

    // 2. Find the candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    // 3. Update candidate vote count and user voting status
    candidate.voteCount += 1;
    user.hasVoted = true;

    await candidate.save();
    await user.save();

    res.json({ message: 'Vote successfully cast!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during voting' });
  }
};