import request from 'supertest';
import app from '@/server';
import User from '@/models/User.model';
import { connectDB, disconnectDB } from '@/config/database';

describe('Authentication Controller', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = global.testUtils.createTestUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
          },
          token: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user?.name).toBe(userData.name);
    });

    it('should return 409 if user already exists', async () => {
      const userData = global.testUtils.createTestUser();

      // Create user first
      await User.create(userData);

      // Try to create same user again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User already exists with this email',
      });
    });

    it('should return 400 for invalid input data', async () => {
      const invalidData = {
        name: 'A', // Too short
        email: 'invalid-email',
        phone: '123', // Invalid phone
        password: '123', // Too short
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const userData = global.testUtils.createTestUser();
      
      // Create user first
      await User.create(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: userData.email,
          },
          token: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      const userData = global.testUtils.createTestUser();
      const user = await User.create(userData);
      const token = global.testUtils.generateValidToken(user._id.toString());

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          user: {
            email: userData.email,
            name: userData.name,
          },
        },
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const userData = global.testUtils.createTestUser();
      const user = await User.create(userData);
      const token = global.testUtils.generateValidToken(user._id.toString());

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewPassword123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return 401 for incorrect current password', async () => {
      const userData = global.testUtils.createTestUser();
      const user = await User.create(userData);
      const token = global.testUtils.generateValidToken(user._id.toString());

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
