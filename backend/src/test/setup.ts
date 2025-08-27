import { config } from '@/config/env';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock external services for testing
jest.mock('@/config/redis', () => ({
  redisClient: {
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    keys: jest.fn(),
    clearPattern: jest.fn(),
  },
}));

// Mock email service
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Mock SMS service
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({ sid: 'test-sms-sid' })),
    },
  }));
});

// Mock file upload service
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(() => Promise.resolve({
        public_id: 'test-public-id',
        secure_url: 'https://test-url.com/image.jpg',
      })),
      destroy: jest.fn(() => Promise.resolve({ result: 'ok' })),
    },
  },
}));

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createTestUser: () => any;
        createTestService: () => any;
        generateValidToken: (userId: string) => string;
      };
    }
  }
}

// Test utilities
(global as any).testUtils = {
  createTestUser: () => ({
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    password: 'TestPassword123',
    role: 'customer',
  }),

  createTestService: () => ({
    name: 'Test Service',
    category: 'cleaning',
    description: 'Test service description',
    basePrice: 299,
    duration: 60,
    isActive: true,
  }),

  generateValidToken: (userId: string) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role: 'customer' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  },
};
