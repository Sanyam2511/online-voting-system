import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { ensureDefaultAdmin } from './controllers/authController.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import voteRoutes from './routes/voteRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);

app.get('/', (req, res) => {
  res.send('Voting System API is running...');
});

const bootstrapServer = async () => {
  try {
    await connectDB();
    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server bootstrap failed: ${error.message}`);
    process.exit(1);
  }
};

bootstrapServer();