import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async function globalSetup() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Set up MongoDB Memory Server
  const mongoServer = MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'deshi_sahayak_test'
    }
  });

  const mongoUri = (await mongoServer).getUri();
  
  // Store the MongoDB URI and server instance for cleanup
  process.env.MONGO_URI = mongoUri;
  (global as any).__MONGO_SERVER__ = mongoServer;

  console.log('🚀 Global test setup completed');
  console.log(`📊 MongoDB Test URI: ${mongoUri}`);
}
