import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import voteRoutes from './routes/voteRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);

app.get('/', (_req, res) => {
  res.send('Voting System API is running...');
});

export default app;
