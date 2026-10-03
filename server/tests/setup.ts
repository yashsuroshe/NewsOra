import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Set required env vars for tests before config is imported
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_SECRET'] = 'test-jwt-secret-minimum-32-characters-long!!';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-chars!!';
  process.env['GROQ_API_KEY'] = 'test-groq-key';
  process.env['GEMINI_API_KEY'] = 'test-gemini-key';
  process.env['REDIS_URL'] = 'redis://localhost:6379';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env['MONGODB_URI'] = uri;

  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clean all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]?.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
