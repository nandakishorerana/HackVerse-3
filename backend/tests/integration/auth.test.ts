import request from 'supertest';
import app from '@/server';
import { User } from '@/models/User';
import { ServiceProvider } from '@/models/ServiceProvider';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testUsers } from '../fixtures/testData';

describe('Authentication API', () => {
  beforeEach(async () => {
    await DatabaseHelpers.clearDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const userData = TestDataFactory.createUserData({
        role: 'customer'
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe('customer');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Password should not be returned
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should register a new provider successfully', async () => {
      const providerData = TestDataFactory.createProviderData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(providerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('provider');
      expect(response.body.data.user.bio).toBe(providerData.bio);
      expect(response.body.data.user.services).toEqual(providerData.services);
    });

    it('should fail with invalid email format', async () => {
      const userData = TestDataFactory.createUserData({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      ApiHelpers.expectValidationError(response, 'email');
    });

    it('should fail with invalid phone number', async () => {
      const userData = TestDataFactory.createUserData({
        phone: '123456789' // Invalid Indian phone number
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      ApiHelpers.expectValidationError(response, 'phone');
    });

    it('should fail with weak password', async () => {
      const userData = TestDataFactory.createUserData({
        password: '123' // Too short
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      ApiHelpers.expectValidationError(response, 'password');
    });

    it('should fail when email already exists', async () => {
      const userData = TestDataFactory.createUserData();
      
      // Create user first
      await DatabaseHelpers.createUser(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail when phone already exists', async () => {
      const userData1 = TestDataFactory.createUserData();
      const userData2 = TestDataFactory.createUserData({
        email: 'different@example.com',
        phone: userData1.phone // Same phone
      });
      
      await DatabaseHelpers.createUser(userData1);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData2)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = testUsers.customer;
      const user = await DatabaseHelpers.createUser(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Check that lastLogin is updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.lastLogin).toBeDefined();
      expect(updatedUser?.loginCount).toBe(1);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const userData = testUsers.customer;
      await DatabaseHelpers.createUser(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with inactive account', async () => {
      const userData = testUsers.customer;
      await DatabaseHelpers.createUser({ ...userData, isActive: false });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account is deactivated');
    });

    it('should increment failed login attempts', async () => {
      const userData = testUsers.customer;
      const user = await DatabaseHelpers.createUser(userData);

      // Make failed login attempt
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      // Check failed attempts increased
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.failedLoginAttempts).toBe(1);
    });

    it('should lock account after max failed attempts', async () => {
      const userData = testUsers.customer;
      const user = await DatabaseHelpers.createUser({
        ...userData,
        failedLoginAttempts: 4 // One less than max
      });

      // Make one more failed attempt to trigger lock
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(423);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account locked');

      // Verify account is locked
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.isLocked).toBe(true);
      expect(updatedUser?.lockedUntil).toBeDefined();
    });

    it('should reset failed attempts on successful login', async () => {
      const userData = testUsers.customer;
      const user = await DatabaseHelpers.createUser({
        ...userData,
        failedLoginAttempts: 2
      });

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      // Check failed attempts reset
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.failedLoginAttempts).toBe(0);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh token with valid refresh token', async () => {
      const { user, refreshToken } = await AuthHelpers.createAuthenticatedUser();

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.token).not.toBe(refreshToken); // Should be new token
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should fail with expired refresh token', async () => {
      const { user } = await AuthHelpers.createAuthenticatedUser();
      const expiredToken = AuthHelpers.generateRefreshToken(user._id.toString());
      
      // Mock expired token by setting it with past expiry
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementationOnce(() => {
        throw { name: 'TokenExpiredError' };
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user profile', async () => {
      const { user, token } = await AuthHelpers.createAuthenticatedUser();

      const response = await ApiHelpers.authenticatedRequest(app, token)
        .get('/api/v1/auth/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(user._id.toString());
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const { user, token } = await AuthHelpers.createAuthenticatedUser();

      const response = await ApiHelpers.authenticatedRequest(app, token)
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const user = await DatabaseHelpers.createUser(testUsers.customer);

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');

      // Check that reset token is set
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.passwordResetToken).toBeDefined();
      expect(updatedUser?.passwordResetExpires).toBeDefined();
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      ApiHelpers.expectValidationError(response, 'email');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const user = await DatabaseHelpers.createUser(testUsers.customer);
      
      // Set reset token manually
      const resetToken = 'valid-reset-token';
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await user.save();

      const newPassword = 'newpassword123';

      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successful');

      // Verify password was changed and token cleared
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.passwordResetToken).toBeUndefined();
      expect(updatedUser?.passwordResetExpires).toBeUndefined();

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with invalid reset token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password/invalid-token')
        .send({ password: 'newpassword123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with expired reset token', async () => {
      const user = await DatabaseHelpers.createUser(testUsers.customer);
      
      const resetToken = 'expired-reset-token';
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() - 60 * 1000); // 1 minute ago
      await user.save();

      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${resetToken}`)
        .send({ password: 'newpassword123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const { user, token } = await AuthHelpers.createAuthenticatedUser();
      const currentPassword = 'password123';
      const newPassword = 'newpassword123';

      const response = await ApiHelpers.authenticatedRequest(app, token)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword,
          newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const { user, token } = await AuthHelpers.createAuthenticatedUser();

      const response = await ApiHelpers.authenticatedRequest(app, token)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });
});
