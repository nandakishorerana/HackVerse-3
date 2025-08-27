export default async () => {
  // Clean up the MongoDB instance
  const mongoServer = (global as any).__MONGOSERVER__;
  if (mongoServer) {
    await mongoServer.stop();
  }
};
