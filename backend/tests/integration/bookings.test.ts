import request from 'supertest';
import app from '@/server';
import { Booking } from '@/models/Booking';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testBookings } from '../fixtures/testData';

describe('Bookings API', () => {
  let customerAuth: any;
  let providerAuth: any;
  let adminAuth: any;
  let testProvider: any;
  let testService: any;

  beforeEach(async () => {
    await DatabaseHelpers.clearDatabase();
    
    // Create authenticated users
    customerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
    providerAuth = await AuthHelpers.createAuthenticatedProvider();
    adminAuth = await AuthHelpers.createAuthenticatedAdmin();
    testProvider = providerAuth.provider;

    // Create test service
    testService = await DatabaseHelpers.createService(testProvider._id, {
      name: 'Test Service',
      category: 'Home Services',
      subcategory: 'Cleaning',
      description: 'Test service description',
      price: 1000,
      duration: 120
    });
  });

  describe('POST /api/v1/bookings', () => {
    it('should create booking as customer', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: testService._id,
        providerId: testProvider._id,
        customerId: customerAuth.user._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(201);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.customer).toBe(customerAuth.user._id.toString());
      expect(response.body.data.service).toBe(testService._id.toString());
      expect(response.body.data.provider).toBe(testProvider._id.toString());
      expect(response.body.data.status).toBe('pending');
    });

    it('should fail to create booking as provider', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: testService._id,
        providerId: testProvider._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail without authentication', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: testService._id,
        providerId: testProvider._id
      });

      const response = await request(app)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail with invalid service', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: '507f1f77bcf86cd799439011', // Non-existent service
        providerId: testProvider._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should fail with past date', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: testService._id,
        providerId: testProvider._id,
        scheduledDate: new Date(Date.now() - 86400000) // Yesterday
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should calculate total amount correctly', async () => {
      const bookingData = TestDataFactory.createBookingData({
        serviceId: testService._id,
        providerId: testProvider._id,
        quantity: 2
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.data.totalAmount).toBe(testService.price * 2);
    });
  });

  describe('GET /api/v1/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        ...testBookings.pending
      });
    });

    it('should get customer bookings', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/bookings')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].customer).toBe(customerAuth.user._id.toString());
    });

    it('should get provider bookings', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/bookings')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should get all bookings as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/bookings')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
    });

    it('should filter bookings by status', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/bookings')
        .query({ status: 'pending' })
        .expect(200);

      response.body.data.forEach((booking: any) => {
        expect(booking.status).toBe('pending');
      });
    });

    it('should filter bookings by date range', async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const dayAfterTomorrow = new Date(Date.now() + 172800000);

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/bookings')
        .query({ 
          startDate: tomorrow.toISOString(),
          endDate: dayAfterTomorrow.toISOString()
        })
        .expect(200);

      response.body.data.forEach((booking: any) => {
        const bookingDate = new Date(booking.scheduledDate);
        expect(bookingDate).toBeGreaterThanOrEqual(tomorrow);
        expect(bookingDate).toBeLessThanOrEqual(dayAfterTomorrow);
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    let testBooking: any;

    beforeEach(async () => {
      testBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        ...testBookings.pending
      });
    });

    it('should get booking as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/bookings/${testBooking._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testBooking._id.toString());
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.service).toBeDefined();
    });

    it('should get booking as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get(`/api/v1/bookings/${testBooking._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testBooking._id.toString());
    });

    it('should fail to get others booking', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get(`/api/v1/bookings/${testBooking._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should return 404 for non-existent booking', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/bookings/${nonExistentId}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('PUT /api/v1/bookings/:id/status', () => {
    let testBooking: any;

    beforeEach(async () => {
      testBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        ...testBookings.pending
      });
    });

    it('should accept booking as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'confirmed' })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data.acceptedAt).toBeDefined();
    });

    it('should reject booking as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ 
          status: 'cancelled',
          cancellationReason: 'Provider unavailable'
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancellationReason).toBe('Provider unavailable');
    });

    it('should cancel booking as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ 
          status: 'cancelled',
          cancellationReason: 'Customer cancellation'
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should complete booking as provider', async () => {
      // First confirm the booking
      await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'confirmed' })
        .expect(200);

      // Then mark as completed
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should fail with invalid status transition', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'completed' }) // Can't go directly to completed
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail to update others booking', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'confirmed' })
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should require cancellation reason when cancelling', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/status`)
        .send({ status: 'cancelled' }) // Missing cancellationReason
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('PUT /api/v1/bookings/:id/reschedule', () => {
    let testBooking: any;

    beforeEach(async () => {
      testBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        ...testBookings.confirmed
      });
    });

    it('should reschedule booking as customer', async () => {
      const newDate = new Date(Date.now() + 172800000); // Day after tomorrow
      const rescheduleData = {
        scheduledDate: newDate,
        timeSlot: '14:00',
        reason: 'Customer request'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/reschedule`)
        .send(rescheduleData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.scheduledDate).toBe(newDate.toISOString());
      expect(response.body.data.timeSlot).toBe('14:00');
    });

    it('should reschedule booking as provider', async () => {
      const newDate = new Date(Date.now() + 172800000);
      const rescheduleData = {
        scheduledDate: newDate,
        timeSlot: '16:00',
        reason: 'Provider unavailable'
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/reschedule`)
        .send(rescheduleData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.scheduledDate).toBe(newDate.toISOString());
    });

    it('should fail with past date', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const rescheduleData = {
        scheduledDate: pastDate,
        timeSlot: '10:00',
        reason: 'Invalid date'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/reschedule`)
        .send(rescheduleData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail for completed booking', async () => {
      // Complete the booking first
      await Booking.findByIdAndUpdate(testBooking._id, { 
        status: 'completed',
        completedAt: new Date()
      });

      const newDate = new Date(Date.now() + 172800000);
      const rescheduleData = {
        scheduledDate: newDate,
        timeSlot: '10:00',
        reason: 'Cannot reschedule'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/reschedule`)
        .send(rescheduleData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should require reason for reschedule', async () => {
      const newDate = new Date(Date.now() + 172800000);
      const rescheduleData = {
        scheduledDate: newDate,
        timeSlot: '10:00'
        // Missing reason
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/bookings/${testBooking._id}/reschedule`)
        .send(rescheduleData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/bookings/statistics', () => {
    beforeEach(async () => {
      // Create bookings with different statuses
      await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'pending'
      });

      await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'confirmed'
      });

      await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'completed'
      });
    });

    it('should get booking statistics as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/bookings/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.pending).toBe(1);
      expect(response.body.data.confirmed).toBe(1);
      expect(response.body.data.completed).toBe(1);
    });

    it('should get booking statistics as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/bookings/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.total).toBe(3);
    });

    it('should filter statistics by date range', async () => {
      const today = new Date();
      const tomorrow = new Date(Date.now() + 86400000);

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/bookings/statistics')
        .query({ 
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString()
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/statistics')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });

  describe('POST /api/v1/bookings/:id/payment', () => {
    let testBooking: any;

    beforeEach(async () => {
      testBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'confirmed',
        totalAmount: 1000
      });
    });

    it('should create payment intent for booking', async () => {
      const paymentData = {
        amount: testBooking.totalAmount,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment`)
        .send(paymentData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.paymentIntentId).toBeDefined();
      expect(response.body.data.clientSecret).toBeDefined();
    });

    it('should fail for non-confirmed booking', async () => {
      const pendingBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'pending',
        totalAmount: 1000
      });

      const paymentData = {
        amount: 1000,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/bookings/${pendingBooking._id}/payment`)
        .send(paymentData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail if not booking customer', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const paymentData = {
        amount: testBooking.totalAmount,
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment`)
        .send(paymentData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with amount mismatch', async () => {
      const paymentData = {
        amount: 500, // Different from booking amount
        currency: 'INR'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment`)
        .send(paymentData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/bookings/:id/payment/confirm', () => {
    let testBooking: any;

    beforeEach(async () => {
      testBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'confirmed',
        totalAmount: 1000,
        paymentIntentId: 'pi_test_123'
      });
    });

    it('should confirm payment for booking', async () => {
      const confirmData = {
        paymentIntentId: 'pi_test_123',
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment/confirm`)
        .send(confirmData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.paymentStatus).toBe('paid');
      expect(response.body.data.paidAt).toBeDefined();
    });

    it('should fail with invalid payment intent', async () => {
      const confirmData = {
        paymentIntentId: 'invalid_intent',
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment/confirm`)
        .send(confirmData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail if not booking customer', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const confirmData = {
        paymentIntentId: 'pi_test_123',
        paymentMethodId: 'pm_test_456'
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .post(`/api/v1/bookings/${testBooking._id}/payment/confirm`)
        .send(confirmData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });
  });
});
