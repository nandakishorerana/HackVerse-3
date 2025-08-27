import request from 'supertest';
import app from '@/server';
import { Payment } from '@/models/Payment';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testPayments } from '../fixtures/testData';

describe('Payments API', () => {
  let customerAuth: any;
  let providerAuth: any;
  let adminAuth: any;
  let testProvider: any;
  let testService: any;
  let testBooking: any;

  beforeEach(async () => {
    await DatabaseHelpers.clearDatabase();
    
    // Create authenticated users
    customerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
    providerAuth = await AuthHelpers.createAuthenticatedProvider();
    adminAuth = await AuthHelpers.createAuthenticatedAdmin();
    testProvider = providerAuth.provider;

    // Create test service and booking
    testService = await DatabaseHelpers.createService(testProvider._id, {
      name: 'Test Service',
      category: 'Home Services',
      price: 1000
    });

    testBooking = await DatabaseHelpers.createBooking({
      customer: customerAuth.user._id,
      service: testService._id,
      provider: testProvider._id,
      status: 'confirmed',
      totalAmount: 1000
    });
  });

  describe('POST /api/v1/payments/create-intent', () => {
    it('should create payment intent as customer', async () => {
      const intentData = {
        bookingId: testBooking._id,
        amount: 1000,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(201);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.paymentIntentId).toBeDefined();
      expect(response.body.data.clientSecret).toBeDefined();
      expect(response.body.data.amount).toBe(1000);
      expect(response.body.data.currency).toBe('INR');
    });

    it('should fail without authentication', async () => {
      const intentData = {
        bookingId: testBooking._id,
        amount: 1000,
        currency: 'INR'
      };

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail with invalid booking', async () => {
      const intentData = {
        bookingId: '507f1f77bcf86cd799439011', // Non-existent booking
        amount: 1000,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should fail with amount mismatch', async () => {
      const intentData = {
        bookingId: testBooking._id,
        amount: 500, // Different from booking amount
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail if not booking customer', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const intentData = {
        bookingId: testBooking._id,
        amount: 1000,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with invalid amount', async () => {
      const intentData = {
        bookingId: testBooking._id,
        amount: -100, // Negative amount
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/create-intent')
        .send(intentData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/payments/confirm', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.pendingPayment
      });
    });

    it('should confirm payment', async () => {
      const confirmData = {
        paymentIntentId: testPayment.paymentIntentId,
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/confirm')
        .send(confirmData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.paidAt).toBeDefined();
    });

    it('should fail with invalid payment intent', async () => {
      const confirmData = {
        paymentIntentId: 'invalid_intent',
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/confirm')
        .send(confirmData)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should fail if not payment customer', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const confirmData = {
        paymentIntentId: testPayment.paymentIntentId,
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .post('/api/v1/payments/confirm')
        .send(confirmData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail for already completed payment', async () => {
      // Complete payment first
      await Payment.findByIdAndUpdate(testPayment._id, {
        status: 'completed',
        paidAt: new Date()
      });

      const confirmData = {
        paymentIntentId: testPayment.paymentIntentId,
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/payments/confirm')
        .send(confirmData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments', () => {
    beforeEach(async () => {
      await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });
    });

    it('should get customer payments', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].customer).toBe(customerAuth.user._id.toString());
    });

    it('should get provider payments', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/payments')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should get all payments as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/payments')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
    });

    it('should filter payments by status', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments')
        .query({ status: 'completed' })
        .expect(200);

      response.body.data.forEach((payment: any) => {
        expect(payment.status).toBe('completed');
      });
    });

    it('should filter payments by date range', async () => {
      const startDate = new Date(Date.now() - 86400000); // Yesterday
      const endDate = new Date(); // Today

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      response.body.data.forEach((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        expect(paymentDate).toBeGreaterThanOrEqual(startDate);
        expect(paymentDate).toBeLessThanOrEqual(endDate);
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });
    });

    it('should get payment as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testPayment._id.toString());
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.booking).toBeDefined();
    });

    it('should get payment as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testPayment._id.toString());
    });

    it('should fail to get others payment', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should return 404 for non-existent payment', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/payments/${nonExistentId}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });
    });

    it('should process refund as admin', async () => {
      const refundData = {
        amount: 500,
        reason: 'Service not satisfactory'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/refund`)
        .send(refundData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.refundAmount).toBe(refundData.amount);
      expect(response.body.data.refundReason).toBe(refundData.reason);
      expect(response.body.data.refundedAt).toBeDefined();
    });

    it('should process full refund', async () => {
      const refundData = {
        amount: testPayment.amount,
        reason: 'Full refund requested'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/refund`)
        .send(refundData)
        .expect(200);

      expect(response.body.data.status).toBe('refunded');
      expect(response.body.data.refundAmount).toBe(testPayment.amount);
    });

    it('should fail as non-admin', async () => {
      const refundData = {
        amount: 500,
        reason: 'Test refund'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/refund`)
        .send(refundData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with amount exceeding payment', async () => {
      const refundData = {
        amount: 1500, // More than payment amount
        reason: 'Invalid refund'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/refund`)
        .send(refundData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail for pending payment', async () => {
      const pendingPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.pendingPayment
      });

      const refundData = {
        amount: 500,
        reason: 'Cannot refund pending'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/payments/${pendingPayment._id}/refund`)
        .send(refundData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should require refund reason', async () => {
      const refundData = {
        amount: 500
        // Missing reason
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/refund`)
        .send(refundData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments/statistics', () => {
    beforeEach(async () => {
      // Create payments with different statuses
      await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        amount: 1000,
        status: 'completed'
      });

      await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        amount: 500,
        status: 'pending'
      });

      await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        amount: 300,
        status: 'failed'
      });
    });

    it('should get payment statistics as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalPayments).toBe(3);
      expect(response.body.data.totalAmount).toBe(1800);
      expect(response.body.data.completedPayments).toBe(1);
      expect(response.body.data.pendingPayments).toBe(1);
      expect(response.body.data.failedPayments).toBe(1);
    });

    it('should get payment statistics as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/payments/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalPayments).toBe(3);
      expect(response.body.data.earnings).toBe(1000); // Only completed payments
    });

    it('should get full statistics as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/payments/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalPayments).toBe(3);
      expect(response.body.data.totalRevenue).toBe(1000);
      expect(response.body.data.platformFees).toBeDefined();
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 86400000); // Yesterday
      const endDate = new Date(); // Today

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments/statistics')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(typeof response.body.data.totalPayments).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/payments/statistics')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should process Razorpay webhook', async () => {
      const webhookData = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              status: 'captured',
              amount: 100000, // Amount in paise
              order_id: 'order_test_456'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('X-Razorpay-Signature', 'test_signature')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle payment failed webhook', async () => {
      const webhookData = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              status: 'failed',
              amount: 100000,
              order_id: 'order_test_456',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment failed'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('X-Razorpay-Signature', 'test_signature')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid signature', async () => {
      const webhookData = {
        event: 'payment.captured',
        payload: { payment: { entity: {} } }
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('X-Razorpay-Signature', 'invalid_signature')
        .send(webhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/payments/:id/receipt', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });
    });

    it('should get payment receipt as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}/receipt`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.receiptId).toBeDefined();
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.booking).toBeDefined();
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.provider).toBeDefined();
    });

    it('should get payment receipt as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}/receipt`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.receiptId).toBeDefined();
    });

    it('should fail to get others payment receipt', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get(`/api/v1/payments/${testPayment._id}/receipt`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail for incomplete payment', async () => {
      const pendingPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.pendingPayment
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/payments/${pendingPayment._id}/receipt`)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/payments/:id/dispute', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });
    });

    it('should create payment dispute as customer', async () => {
      const disputeData = {
        reason: 'Service not provided',
        description: 'Provider did not show up for the appointment',
        evidence: ['photo1.jpg', 'message_screenshot.png']
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/dispute`)
        .send(disputeData)
        .expect(201);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.dispute.reason).toBe(disputeData.reason);
      expect(response.body.data.dispute.status).toBe('pending');
      expect(response.body.data.dispute.evidence).toEqual(disputeData.evidence);
    });

    it('should fail to create duplicate dispute', async () => {
      const disputeData = {
        reason: 'Service not provided',
        description: 'First dispute'
      };

      // Create first dispute
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/dispute`)
        .send(disputeData)
        .expect(201);

      // Try to create duplicate
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/dispute`)
        .send(disputeData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail as provider', async () => {
      const disputeData = {
        reason: 'Test dispute',
        description: 'Provider dispute'
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/dispute`)
        .send(disputeData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail for pending payment', async () => {
      const pendingPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.pendingPayment
      });

      const disputeData = {
        reason: 'Cannot dispute pending',
        description: 'Test'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${pendingPayment._id}/dispute`)
        .send(disputeData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should require dispute reason', async () => {
      const disputeData = {
        description: 'Missing reason'
        // Missing reason
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${testPayment._id}/dispute`)
        .send(disputeData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments/disputes', () => {
    beforeEach(async () => {
      const payment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment
      });

      // Create dispute
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/payments/${payment._id}/dispute`)
        .send({
          reason: 'Service not provided',
          description: 'Test dispute'
        })
        .expect(201);
    });

    it('should get disputes as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/payments/disputes')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].dispute).toBeDefined();
      expect(response.body.data[0].dispute.status).toBe('pending');
    });

    it('should get customer disputes', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/payments/disputes')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].customer).toBe(customerAuth.user._id.toString());
    });

    it('should get provider disputes', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/payments/disputes')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should filter disputes by status', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/payments/disputes')
        .query({ status: 'pending' })
        .expect(200);

      response.body.data.forEach((payment: any) => {
        expect(payment.dispute.status).toBe('pending');
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/payments/disputes')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('PUT /api/v1/payments/disputes/:id/resolve', () => {
    let disputedPayment: any;

    beforeEach(async () => {
      disputedPayment = await DatabaseHelpers.createPayment({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        booking: testBooking._id,
        ...testPayments.completedPayment,
        dispute: {
          reason: 'Service not provided',
          description: 'Test dispute',
          status: 'pending',
          createdAt: new Date()
        }
      });
    });

    it('should resolve dispute in favor of customer as admin', async () => {
      const resolveData = {
        resolution: 'customer',
        refundAmount: 1000,
        adminNotes: 'Customer complaint is valid'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/payments/disputes/${disputedPayment._id}/resolve`)
        .send(resolveData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.dispute.status).toBe('resolved');
      expect(response.body.data.dispute.resolution).toBe('customer');
      expect(response.body.data.refundAmount).toBe(1000);
    });

    it('should resolve dispute in favor of provider as admin', async () => {
      const resolveData = {
        resolution: 'provider',
        adminNotes: 'Service was provided correctly'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/payments/disputes/${disputedPayment._id}/resolve`)
        .send(resolveData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.dispute.resolution).toBe('provider');
      expect(response.body.data.refundAmount).toBe(0);
    });

    it('should fail as non-admin', async () => {
      const resolveData = {
        resolution: 'customer',
        adminNotes: 'Unauthorized resolution'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/payments/disputes/${disputedPayment._id}/resolve`)
        .send(resolveData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should require resolution type', async () => {
      const resolveData = {
        adminNotes: 'Missing resolution type'
        // Missing resolution
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/payments/disputes/${disputedPayment._id}/resolve`)
        .send(resolveData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments/methods', () => {
    it('should get available payment methods', async () => {
      const response = await request(app)
        .get('/api/v1/payments/methods')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.methods).toBeInstanceOf(Array);
      expect(response.body.data.methods.length).toBeGreaterThan(0);
      
      const methodTypes = response.body.data.methods.map((method: any) => method.type);
      expect(methodTypes).toContain('card');
      expect(methodTypes).toContain('netbanking');
      expect(methodTypes).toContain('upi');
    });

    it('should include supported currencies', async () => {
      const response = await request(app)
        .get('/api/v1/payments/methods')
        .expect(200);

      expect(response.body.data.supportedCurrencies).toContain('INR');
    });
  });
});
