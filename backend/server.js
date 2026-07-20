import dotenv from 'dotenv';
import connectDB from './config/db.js';

import app from './app.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

export const bootstrapServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server bootstrap failed: ${error.message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  bootstrapServer();
}

export default app;