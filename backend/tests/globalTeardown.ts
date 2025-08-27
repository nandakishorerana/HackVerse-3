import mongoose from 'mongoose';

export default async function globalTeardown() {
  // Close mongoose connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Stop MongoDB Memory Server
  const mongoServer = (global as any).__MONGO_SERVER__;
  if (mongoServer) {
    await mongoServer.stop();
  }

  console.log('🧹 Global test teardown completed');
}
