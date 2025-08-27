import mongoose from 'mongoose';
import logger from './logger';
import { config } from './env';

interface ConnectionOptions {
  useNewUrlParser: boolean;
  useUnifiedTopology: boolean;
  maxPoolSize: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  family: number;
}

const options: ConnectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = config.nodeEnv === 'test' ? config.mongodb.testUri : config.mongodb.uri;
    
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(mongoUri, options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
};

// Health check function
export const checkDBHealth = async (): Promise<boolean> => {
  try {
    const state = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    return state === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

export default {
  connectDB,
  disconnectDB,
  checkDBHealth
};
