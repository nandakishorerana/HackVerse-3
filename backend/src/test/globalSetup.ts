import { MongoMemoryServer } from 'mongodb-memory-server';

export default async () => {
  // Create in-memory MongoDB instance for testing
  const mongoServer = MongoMemoryServer.create();
  const mongoUri = (await mongoServer).getUri();
  
  // Set the database URI for tests
  process.env.MONGODB_TEST_URI = mongoUri;
  
  // Store the server instance for cleanup
  (global as any).__MONGOSERVER__ = mongoServer;
};
