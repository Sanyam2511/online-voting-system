import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const VERIFICATION_HASH_SEPARATOR = '::';

const buildHashInput = ({ code, userId, electionId }) => {
  return [String(code), String(userId), String(electionId)].join(VERIFICATION_HASH_SEPARATOR);
};

export const generateVoteVerificationCode = () => {
  const numericCode = crypto.randomInt(0, 1000000);
  return String(numericCode).padStart(6, '0');
};

export const hashVoteVerificationCode = ({ code, userId, electionId }) => {
  return crypto
    .createHash('sha256')
    .update(buildHashInput({ code, userId, electionId }))
    .digest('hex');
};

export const signVoteVerificationToken = ({ userId, electionId, challengeId }) => {
  return jwt.sign(
    {
      userId: String(userId),
      electionId: String(electionId),
      challengeId: String(challengeId),
      purpose: 'vote-cast'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '10m'
    }
  );
};

export const verifyVoteVerificationToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
