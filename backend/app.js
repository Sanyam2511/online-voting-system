import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import voteRoutes from './routes/voteRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import securityRoutes from './routes/securityRoutes.js';

const app = express();
app.set('trust proxy', 1);

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/security', securityRoutes);

app.get('/', (_req, res) => {
  res.send('Voting System API is running...');
});

export default app;
