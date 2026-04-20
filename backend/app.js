import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import voteRoutes from './routes/voteRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/disputes', disputeRoutes);

app.get('/', (_req, res) => {
  res.send('Voting System API is running...');
});

export default app;
