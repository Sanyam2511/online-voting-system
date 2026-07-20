import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from '../models/Candidate.js';
import Election from '../models/Election.js';
import User from '../models/User.js';
import VoteReceipt from '../models/VoteReceipt.js';
import defaultCandidates from '../data/defaultCandidates.js';
import bcrypt from 'bcryptjs';
import { createUniqueElectionSlug } from '../utils/voteUtils.js';

dotenv.config();

const DEFAULT_ELECTION_NAME = 'National General Election 2026';
const DEFAULT_ELECTION_SLUG = 'national-general-election-2026';

const ensureDefaultElection = async () => {
  let election = await Election.findOne({ slug: DEFAULT_ELECTION_SLUG });
  if (!election) {
    election = await Election.findOne({ name: DEFAULT_ELECTION_NAME });
  }

  if (election) {
    let shouldSave = false;
    if (!election.slug) {
      election.slug = await createUniqueElectionSlug(DEFAULT_ELECTION_SLUG, election.id);
      shouldSave = true;
    }
    if (!election.votingStartsAt) {
      election.votingStartsAt = new Date(Date.now() - (24 * 60 * 60 * 1000));
      shouldSave = true;
    }
    if (!election.votingEndsAt) {
      election.votingEndsAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
      shouldSave = true;
    }
    if (election.status === 'draft') {
      election.status = 'live';
      shouldSave = true;
    }
    if (shouldSave) await election.save();
    return election;
  }

  const now = Date.now();
  return Election.create({
    name: DEFAULT_ELECTION_NAME,
    slug: DEFAULT_ELECTION_SLUG,
    description: 'Default election seeded for initial platform bootstrapping.',
    status: 'live',
    votingStartsAt: new Date(now - (24 * 60 * 60 * 1000)),
    votingEndsAt: new Date(now + (365 * 24 * 60 * 60 * 1000))
  });
};

const ensureCandidatesSeeded = async () => {
  const defaultElection = await ensureDefaultElection();
  const candidateCount = await Candidate.estimatedDocumentCount();

  if (candidateCount === 0) {
    const seededCandidates = defaultCandidates.map((c) => ({ ...c, election: defaultElection.id }));
    await Candidate.insertMany(seededCandidates);
    return;
  }

  const elections = await Election.find({}).select('name');
  for (const election of elections) {
    await Candidate.updateMany(
      { $or: [{ election: { $exists: false } }, { election: null }] },
      { $set: { election: election.id } }
    );
  }

  await Candidate.updateMany(
    { $or: [{ election: { $exists: false } }, { election: null }] },
    { $set: { election: defaultElection.id } }
  );
};

const ensureVoteReceiptIndexes = async () => {
  try {
    await VoteReceipt.syncIndexes();
  } catch (error) {
    console.error(`[VoteReceiptIndexSync] ${error.message}`);
  }
};

const ensureDefaultAdmin = async () => {
  const adminEmail = 'admin@securevote.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) return;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  await User.create({ name: 'System Admin', email: adminEmail, password: hashedPassword, role: 'Admin', isVerified: true });
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    await ensureDefaultAdmin();
    await ensureDefaultElection();
    await ensureCandidatesSeeded();
    await ensureVoteReceiptIndexes();
    console.log('Seeding successful');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
