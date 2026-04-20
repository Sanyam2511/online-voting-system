import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Election from '../models/Election.js';
import VoteVerificationChallenge from '../models/VoteVerificationChallenge.js';
import {
  generateVoteVerificationCode,
  hashVoteVerificationCode,
  signVoteVerificationToken
} from '../lib/voteVerification.js';

const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@securevote.com').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000;
const VERIFICATION_TOKEN_LIFETIME_SECONDS = 10 * 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const buildAuthResponse = (user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  hasVoted: user.hasVoted,
  token: generateToken(user._id)
});

const resolveElectionForVerification = async (electionId) => {
  if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
    return { error: { status: 400, message: 'A valid electionId is required.' } };
  }

  const election = await Election.findById(electionId)
    .select('name status votingStartsAt votingEndsAt');

  if (!election) {
    return { error: { status: 404, message: 'Election not found.' } };
  }

  if (election.status !== 'live') {
    return { error: { status: 400, message: 'Verification is only available for live elections.' } };
  }

  const now = new Date();

  if (election.votingStartsAt && now < election.votingStartsAt) {
    return { error: { status: 400, message: 'Voting has not started for this election yet.' } };
  }

  if (election.votingEndsAt && now > election.votingEndsAt) {
    return { error: { status: 400, message: 'Voting has already ended for this election.' } };
  }

  return { election };
};

export const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'Admin' });

  if (existingAdmin) {
    return;
  }

  const userByEmail = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (userByEmail) {
    userByEmail.role = 'Admin';
    userByEmail.isVerified = true;
    await userByEmail.save();
    console.log(`[AdminSeed] Existing user promoted to admin: ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

  await User.create({
    name: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    password: hashedPassword,
    role: 'Admin',
    isVerified: true
  });

  console.log(`[AdminSeed] Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
};

// @desc Register new voter
export const registerVoter = async (req, res) => {
  const { name, password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });
    if (user) {
      res.status(201).json(buildAuthResponse(user));
      return;
    }

    res.status(400).json({ message: 'Invalid voter data' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Authenticate a voter
export const loginVoter = async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json(buildAuthResponse(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Get currently authenticated voter
export const getCurrentVoter = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasVoted: user.hasVoted,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Request vote verification code for strong ballot verification
export const requestVoteVerificationCode = async (req, res) => {
  try {
    if (req.user.role !== 'Voter') {
      return res.status(403).json({ message: 'Strong voter verification is available only for voter accounts.' });
    }

    const electionId = String(req.body.electionId || req.query.electionId || '').trim();
    const { election, error } = await resolveElectionForVerification(electionId);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const verificationCode = generateVoteVerificationCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + VERIFICATION_CODE_TTL_MS);

    await VoteVerificationChallenge.findOneAndUpdate(
      {
        user: req.user.id,
        election: election.id
      },
      {
        $set: {
          electionName: election.name,
          codeHash: hashVoteVerificationCode({
            code: verificationCode,
            userId: req.user.id,
            electionId: election.id
          }),
          requestedAt: now,
          expiresAt,
          verifiedAt: null,
          consumedAt: null,
          attempts: 0,
          maxAttempts: MAX_VERIFICATION_ATTEMPTS
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const payload = {
      message: 'Verification code generated. Enter the 6-digit code to unlock vote casting.',
      electionId: election.id,
      electionName: election.name,
      expiresAt,
      expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000)
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.verificationCodePreview = verificationCode;
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Server error while requesting voter verification.' });
  }
};

// @desc Verify vote verification code and issue vote verification token
export const verifyVoteVerificationCode = async (req, res) => {
  try {
    if (req.user.role !== 'Voter') {
      return res.status(403).json({ message: 'Strong voter verification is available only for voter accounts.' });
    }

    const electionId = String(req.body.electionId || '').trim();
    const submittedCode = String(req.body.code || '').trim();

    if (!/^\d{6}$/.test(submittedCode)) {
      return res.status(400).json({ message: 'A valid 6-digit verification code is required.' });
    }

    const { election, error } = await resolveElectionForVerification(electionId);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const challenge = await VoteVerificationChallenge.findOne({
      user: req.user.id,
      election: election.id
    });

    if (!challenge) {
      return res.status(404).json({ message: 'No verification challenge found. Request a new code first.' });
    }

    if (challenge.consumedAt) {
      return res.status(400).json({ message: 'Verification challenge already consumed. Request a new code.' });
    }

    const now = new Date();

    if (challenge.expiresAt <= now) {
      await VoteVerificationChallenge.deleteOne({ _id: challenge.id });
      return res.status(400).json({ message: 'Verification code has expired. Request a new code.' });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      return res.status(429).json({ message: 'Maximum verification attempts reached. Request a new code.' });
    }

    const submittedCodeHash = hashVoteVerificationCode({
      code: submittedCode,
      userId: req.user.id,
      electionId: election.id
    });

    if (submittedCodeHash !== challenge.codeHash) {
      challenge.attempts = Number(challenge.attempts || 0) + 1;
      await challenge.save();

      const attemptsRemaining = Math.max(0, challenge.maxAttempts - challenge.attempts);

      return res.status(401).json({
        message: attemptsRemaining > 0
          ? `Invalid verification code. ${attemptsRemaining} attempt(s) remaining.`
          : 'Verification attempts exhausted. Request a new code.',
        attemptsRemaining
      });
    }

    challenge.verifiedAt = now;
    challenge.attempts = 0;
    await challenge.save();

    const verificationToken = signVoteVerificationToken({
      userId: req.user.id,
      electionId: election.id,
      challengeId: challenge.id
    });

    return res.status(200).json({
      message: 'Voter verification successful. You can now cast your vote.',
      electionId: election.id,
      electionName: election.name,
      verificationToken,
      expiresInSeconds: VERIFICATION_TOKEN_LIFETIME_SECONDS
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while verifying voter code.' });
  }
};