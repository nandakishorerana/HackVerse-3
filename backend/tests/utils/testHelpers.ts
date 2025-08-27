import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '@/models/User';
import { ServiceProvider } from '@/models/ServiceProvider';
import { Service } from '@/models/Service';
import { Booking } from '@/models/Booking';
import { Review } from '@/models/Review';

// Test data interfaces
export interface TestUser {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'provider' | 'admin';
  isVerified?: boolean;
  isActive?: boolean;
}

export interface TestService {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  duration: number;
  providerId: string;
}

export interface TestBooking {
  customerId: string;
  providerId: string;
  serviceId: string;
  scheduledDate: Date;
  address: any;
  serviceAmount: number;
}

// Test data factories
export class TestDataFactory {
  
  // Create test user data
  static createUserData(overrides: Partial<TestUser> = {}): TestUser {
    const randomId = Math.floor(Math.random() * 10000);
    return {
      name: `Test User ${randomId}`,
      email: `test${randomId}@example.com`,
      phone: `987654${String(randomId).padStart(4, '0')}`,
      password: 'password123',
      role: 'customer',
      isVerified: true,
      isActive: true,
      ...overrides
    };
  }

  // Create test provider data
  static createProviderData(overrides: any = {}): any {
    const randomId = Math.floor(Math.random() * 10000);
    return {
      name: `Test Provider ${randomId}`,
      email: `provider${randomId}@example.com`,
      phone: `876543${String(randomId).padStart(4, '0')}`,
      password: 'password123',
      bio: `Professional service provider with experience`,
      experience: 3,
      services: ['Test Service'],
      certifications: ['Test Certificate'],
      address: {
        type: 'work',
        street: `${randomId} Test Street`,
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      isVerified: true,
      isActive: true,
      ...overrides
    };
  }

  // Create test service data
  static createServiceData(providerId: string, overrides: Partial<TestService> = {}): TestService {
    const randomId = Math.floor(Math.random() * 10000);
    return {
      name: `Test Service ${randomId}`,
      description: 'Professional test service',
      category: 'Home Services',
      subcategory: 'Cleaning',
      price: 1000,
      duration: 120,
      providerId,
      ...overrides
    };
  }

  // Create test booking data
  static createBookingData(
    customerId: string, 
    providerId: string, 
    serviceId: string, 
    overrides: Partial<TestBooking> = {}
  ): TestBooking {
    return {
      customerId,
      providerId,
      serviceId,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      address: {
        type: 'home',
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      serviceAmount: 1000,
      ...overrides
    };
  }

  // Create test review data
  static createReviewData(overrides: any = {}): any {
    return {
      rating: 5,
      comment: 'Excellent service! Very professional.',
      images: [],
      ...overrides
    };
  }
}

// Database helpers
export class DatabaseHelpers {
  
  // Create user in database
  static async createUser(userData: Partial<TestUser> = {}): Promise<any> {
    const data = TestDataFactory.createUserData(userData);
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return await User.create({
      ...data,
      password: hashedPassword
    });
  }

  // Create provider in database
  static async createProvider(providerData: any = {}): Promise<any> {
    const data = TestDataFactory.createProviderData(providerData);
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return await ServiceProvider.create({
      ...data,
      password: hashedPassword
    });
  }

  // Create service in database
  static async createService(providerId: string, serviceData: Partial<TestService> = {}): Promise<any> {
    const data = TestDataFactory.createServiceData(providerId, serviceData);
    
    return await Service.create({
      ...data,
      provider: providerId
    });
  }

  // Create booking in database
  static async createBooking(
    customerId: string, 
    providerId: string, 
    serviceId: string, 
    bookingData: Partial<TestBooking> = {}
  ): Promise<any> {
    const data = TestDataFactory.createBookingData(customerId, providerId, serviceId, bookingData);
    
    return await Booking.create({
      ...data,
      customer: customerId,
      provider: providerId,
      service: serviceId,
      platformFee: Math.round(data.serviceAmount * 0.05),
      gstAmount: Math.round(data.serviceAmount * 0.18),
      totalAmount: data.serviceAmount + Math.round(data.serviceAmount * 0.05) + Math.round(data.serviceAmount * 0.18)
    });
  }

  // Create review in database
  static async createReview(
    customerId: string,
    providerId: string,
    serviceId: string,
    bookingId: string,
    reviewData: any = {}
  ): Promise<any> {
    const data = TestDataFactory.createReviewData(reviewData);
    
    return await Review.create({
      ...data,
      customer: customerId,
      provider: providerId,
      service: serviceId,
      booking: bookingId
    });
  }

  // Clean all collections
  static async clearDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
}

// Auth helpers
export class AuthHelpers {
  
  // Generate JWT token
  static generateToken(userId: string, role: string = 'customer'): string {
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }

  // Generate refresh token
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );
  }

  // Create authenticated user and return token
  static async createAuthenticatedUser(userData: Partial<TestUser> = {}): Promise<{
    user: any;
    token: string;
    refreshToken: string;
  }> {
    const user = await DatabaseHelpers.createUser(userData);
    const token = this.generateToken(user._id.toString(), user.role);
    const refreshToken = this.generateRefreshToken(user._id.toString());
    
    return { user, token, refreshToken };
  }

  // Create authenticated provider and return token
  static async createAuthenticatedProvider(providerData: any = {}): Promise<{
    provider: any;
    token: string;
    refreshToken: string;
  }> {
    const provider = await DatabaseHelpers.createProvider(providerData);
    const token = this.generateToken(provider._id.toString(), 'provider');
    const refreshToken = this.generateRefreshToken(provider._id.toString());
    
    return { provider, token, refreshToken };
  }

  // Create admin user and return token
  static async createAuthenticatedAdmin(): Promise<{
    admin: any;
    token: string;
    refreshToken: string;
  }> {
    const admin = await DatabaseHelpers.createUser({ role: 'admin' });
    const token = this.generateToken(admin._id.toString(), 'admin');
    const refreshToken = this.generateRefreshToken(admin._id.toString());
    
    return { admin, token, refreshToken };
  }
}

// API helpers
export class ApiHelpers {
  
  // Make authenticated request
  static authenticatedRequest(app: any, token: string) {
    return request(app).set('Authorization', `Bearer ${token}`);
  }

  // Login user and get token
  static async loginUser(app: any, email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.token;
  }

  // Register user and get token
  static async registerUser(app: any, userData: Partial<TestUser>): Promise<{
    user: any;
    token: string;
  }> {
    const data = TestDataFactory.createUserData(userData);
    
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(data)
      .expect(201);

    return {
      user: response.body.data.user,
      token: response.body.data.token
    };
  }

  // Common assertion helpers
  static expectValidationError(response: any, field?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
    
    if (field) {
      expect(response.body.message).toContain(field);
    }
  }

  static expectUnauthorizedError(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Authentication');
  }

  static expectForbiddenError(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('permission');
  }

  static expectNotFoundError(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not found');
  }

  static expectSuccessResponse(response: any, expectedData?: any): void {
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  static expectPaginatedResponse(response: any): void {
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.total).toBeDefined();
    expect(response.body.page).toBeDefined();
    expect(response.body.results).toBeDefined();
  }
}

// Mock helpers
export class MockHelpers {
  
  // Mock successful payment
  static mockSuccessfulPayment(): void {
    const mockRazorpay = require('razorpay');
    mockRazorpay().orders.create.mockResolvedValue({
      id: 'order_test123',
      amount: 1000,
      currency: 'INR',
      status: 'created'
    });
    
    mockRazorpay().utils.validatePaymentSignature.mockReturnValue(true);
  }

  // Mock failed payment
  static mockFailedPayment(): void {
    const mockRazorpay = require('razorpay');
    mockRazorpay().orders.create.mockRejectedValue(new Error('Payment failed'));
  }

  // Mock successful email
  static mockSuccessfulEmail(): void {
    const mockNodemailer = require('nodemailer');
    mockNodemailer.createTransport().sendMail.mockResolvedValue({
      messageId: 'test-message-id'
    });
  }

  // Mock failed email
  static mockFailedEmail(): void {
    const mockNodemailer = require('nodemailer');
    mockNodemailer.createTransport().sendMail.mockRejectedValue(new Error('Email failed'));
  }

  // Mock successful SMS
  static mockSuccessfulSMS(): void {
    const mockTwilio = require('twilio');
    mockTwilio().messages.create.mockResolvedValue({
      sid: 'test-message-sid',
      status: 'sent'
    });
  }

  // Mock failed SMS
  static mockFailedSMS(): void {
    const mockTwilio = require('twilio');
    mockTwilio().messages.create.mockRejectedValue(new Error('SMS failed'));
  }
}

// Wait helper for async operations
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Random data generators
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2);
};

export const generateRandomEmail = (): string => {
  return `test${Math.floor(Math.random() * 10000)}@example.com`;
};

export const generateRandomPhone = (): string => {
  return `9${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`;
};
