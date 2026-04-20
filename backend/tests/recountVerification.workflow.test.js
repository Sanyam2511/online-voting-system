import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../app.js';
import connectDB from '../config/db.js';
import { ensureDefaultAdmin } from '../controllers/authController.js';
import { ensureElectionInfrastructure } from '../controllers/voteController.js';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import VoteReceipt from '../models/VoteReceipt.js';
import VoteVerificationChallenge from '../models/VoteVerificationChallenge.js';
import ElectionDispute from '../models/ElectionDispute.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@securevote.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

describe('Recount + Strong Verification Workflow', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'workflow-test-secret';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();

    await connectDB();
    await ensureDefaultAdmin();
    await ensureElectionInfrastructure();
  });

  beforeEach(async () => {
    await User.deleteMany({ role: 'Voter' });
    await VoteReceipt.deleteMany({});
    await VoteVerificationChallenge.deleteMany({});
    await ElectionDispute.deleteMany({});
    await Candidate.updateMany({}, { $set: { voteCount: 0 } });
  });

  afterAll(async () => {
    await mongoose.connection.close();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('supports voter verification, vote casting, dispute filing, and admin resolution', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Workflow Voter',
        email: 'workflowvoter@example.com',
        password: 'Password123'
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body?.token).toBeTruthy();

    const voterToken = registerResponse.body.token;

    const electionsResponse = await request(app)
      .get('/api/vote/elections/public');

    expect(electionsResponse.status).toBe(200);
    expect(Array.isArray(electionsResponse.body?.elections)).toBe(true);
    expect(electionsResponse.body.elections.length).toBeGreaterThan(0);

    const election = electionsResponse.body.elections.find((entry) => entry.status === 'live') || electionsResponse.body.elections[0];

    const candidatesResponse = await request(app)
      .get('/api/vote/candidates')
      .query({ electionId: election._id });

    expect(candidatesResponse.status).toBe(200);
    expect(Array.isArray(candidatesResponse.body?.candidates)).toBe(true);
    expect(candidatesResponse.body.candidates.length).toBeGreaterThan(0);

    const candidate = candidatesResponse.body.candidates[0];

    const castWithoutVerificationResponse = await request(app)
      .post('/api/vote/cast')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        candidateId: candidate._id,
        electionId: election._id
      });

    expect(castWithoutVerificationResponse.status).toBe(400);
    expect(castWithoutVerificationResponse.body?.message).toContain('verificationToken is required');

    const requestCodeResponse = await request(app)
      .post('/api/auth/vote-verification/request')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ electionId: election._id });

    expect(requestCodeResponse.status).toBe(200);
    expect(requestCodeResponse.body?.verificationCodePreview).toMatch(/^\d{6}$/);

    const verifyCodeResponse = await request(app)
      .post('/api/auth/vote-verification/verify')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        electionId: election._id,
        code: requestCodeResponse.body.verificationCodePreview
      });

    expect(verifyCodeResponse.status).toBe(200);
    expect(verifyCodeResponse.body?.verificationToken).toBeTruthy();

    const castVoteResponse = await request(app)
      .post('/api/vote/cast')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        candidateId: candidate._id,
        electionId: election._id,
        verificationToken: verifyCodeResponse.body.verificationToken
      });

    expect(castVoteResponse.status).toBe(200);
    expect(castVoteResponse.body?.receipt?.receiptCode).toBeTruthy();

    const receiptCode = castVoteResponse.body.receipt.receiptCode;

    const createDisputeResponse = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        electionId: election._id,
        type: 'recount',
        subject: 'Request recount after tally mismatch',
        description: 'The final tally appears inconsistent with polling station logs and requires a recount review.',
        receiptCode
      });

    expect(createDisputeResponse.status).toBe(201);
    expect(createDisputeResponse.body?.dispute?.status).toBe('open');

    const disputeId = createDisputeResponse.body.dispute._id;

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });

    expect(adminLoginResponse.status).toBe(200);
    expect(adminLoginResponse.body?.token).toBeTruthy();

    const adminToken = adminLoginResponse.body.token;

    const adminQueueResponse = await request(app)
      .get('/api/disputes/manage')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ electionId: election._id });

    expect(adminQueueResponse.status).toBe(200);
    expect(adminQueueResponse.body?.disputes?.some((entry) => entry._id === disputeId)).toBe(true);

    const resolveDisputeResponse = await request(app)
      .patch(`/api/disputes/manage/${disputeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved',
        resolutionNote: 'Receipt integrity and candidate totals were reconciled with audit logs. No recount escalation needed.'
      });

    expect(resolveDisputeResponse.status).toBe(200);
    expect(resolveDisputeResponse.body?.dispute?.status).toBe('resolved');

    const myCasesResponse = await request(app)
      .get('/api/disputes/me')
      .set('Authorization', `Bearer ${voterToken}`)
      .query({ electionId: election._id });

    expect(myCasesResponse.status).toBe(200);

    const updatedCase = myCasesResponse.body.disputes.find((entry) => entry._id === disputeId);
    expect(updatedCase).toBeTruthy();
    expect(updatedCase.status).toBe('resolved');
  });
});
