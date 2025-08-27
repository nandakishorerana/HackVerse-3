import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Mock external services
jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent'
      })
    }
  }))
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id'
    })
  }))
}));

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test123',
        amount: 1000,
        currency: 'INR',
        status: 'created'
      }),
      fetch: jest.fn().mockResolvedValue({
        id: 'order_test123',
        status: 'paid'
      })
    },
    payments: {
      fetch: jest.fn().mockResolvedValue({
        id: 'pay_test123',
        status: 'captured'
      }),
      refund: jest.fn().mockResolvedValue({
        id: 'rfnd_test123',
        amount: 1000
      })
    },
    utils: {
      validatePaymentSignature: jest.fn().mockReturnValue(true)
    }
  }));
});

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: 'test-image-id',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-image-id.jpg'
      }),
      destroy: jest.fn().mockResolvedValue({
        result: 'ok'
      })
    }
  }
}));

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn()
  }))
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Setup console overrides for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors for debugging
};

// Setup global test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/deshi_sahayak_test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

// Clean up database between tests
beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Clean up after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
      toBeValidEmail(): R;
      toBeValidPhoneNumber(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidObjectId(received: string) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidPhoneNumber(received: string) {
    const phoneRegex = /^[6-9]\d{9}$/;
    const pass = phoneRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Indian phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Indian phone number`,
        pass: false,
      };
    }
  }
});
