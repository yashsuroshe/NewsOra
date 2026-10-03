import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error({ err: error }, '❌ MongoDB connection failed');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

// Reconnect on unexpected disconnection
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting reconnect');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
