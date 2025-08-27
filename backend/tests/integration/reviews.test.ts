import request from 'supertest';
import app from '@/server';
import { Review } from '@/models/Review';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testReviews } from '../fixtures/testData';

describe('Reviews API', () => {
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

    // Create test service and completed booking
    testService = await DatabaseHelpers.createService(testProvider._id, {
      name: 'Test Service',
      category: 'Home Services',
      subcategory: 'Cleaning',
      price: 1000
    });

    testBooking = await DatabaseHelpers.createBooking({
      customer: customerAuth.user._id,
      service: testService._id,
      provider: testProvider._id,
      status: 'completed',
      completedAt: new Date()
    });
  });

  describe('POST /api/v1/reviews', () => {
    it('should create review for completed booking', async () => {
      const reviewData = TestDataFactory.createReviewData({
        bookingId: testBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(201);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.customer).toBe(customerAuth.user._id.toString());
      expect(response.body.data.provider).toBe(testProvider._id.toString());
      expect(response.body.data.service).toBe(testService._id.toString());
      expect(response.body.data.booking).toBe(testBooking._id.toString());
      expect(response.body.data.rating).toBe(reviewData.rating);
    });

    it('should fail to create review for non-completed booking', async () => {
      const pendingBooking = await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'pending'
      });

      const reviewData = TestDataFactory.createReviewData({
        bookingId: pendingBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail to create duplicate review', async () => {
      const reviewData = TestDataFactory.createReviewData({
        bookingId: testBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      // Create first review
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(201);

      // Try to create duplicate
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail as provider', async () => {
      const reviewData = TestDataFactory.createReviewData({
        bookingId: testBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail without authentication', async () => {
      const reviewData = TestDataFactory.createReviewData({
        bookingId: testBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      const response = await request(app)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail with invalid rating', async () => {
      const invalidData = {
        booking: testBooking._id,
        provider: testProvider._id,
        service: testService._id,
        rating: 6, // Invalid rating (max is 5)
        comment: 'Test review'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/reviews')
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail to review others booking', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const reviewData = TestDataFactory.createReviewData({
        bookingId: testBooking._id,
        providerId: testProvider._id,
        serviceId: testService._id
      });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .post('/api/v1/reviews')
        .send(reviewData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });
  });

  describe('GET /api/v1/reviews', () => {
    beforeEach(async () => {
      // Create test reviews
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });

      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        ...testReviews.goodReview
      });
    });

    it('should get all reviews without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter reviews by provider', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ provider: testProvider._id })
        .expect(200);

      response.body.data.forEach((review: any) => {
        expect(review.provider).toBe(testProvider._id.toString());
      });
    });

    it('should filter reviews by service', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ service: testService._id })
        .expect(200);

      response.body.data.forEach((review: any) => {
        expect(review.service).toBe(testService._id.toString());
      });
    });

    it('should filter reviews by rating', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ rating: 5 })
        .expect(200);

      response.body.data.forEach((review: any) => {
        expect(review.rating).toBe(5);
      });
    });

    it('should filter reviews by minimum rating', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ minRating: 4 })
        .expect(200);

      response.body.data.forEach((review: any) => {
        expect(review.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should sort reviews by newest first', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ sortBy: 'createdAt', sortOrder: 'desc' })
        .expect(200);

      const dates = response.body.data.map((review: any) => new Date(review.createdAt));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.results).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });
  });

  describe('GET /api/v1/reviews/:id', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should get review by ID without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/${testReview._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testReview._id.toString());
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.provider).toBeDefined();
      expect(response.body.data.service).toBeDefined();
    });

    it('should return 404 for non-existent review', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/v1/reviews/${nonExistentId}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/invalid-id')
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('PUT /api/v1/reviews/:id', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should update own review as customer', async () => {
      const updateData = {
        rating: 4,
        comment: 'Updated review comment'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/reviews/${testReview._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.rating).toBe(updateData.rating);
      expect(response.body.data.comment).toBe(updateData.comment);
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should update any review as admin', async () => {
      const updateData = {
        rating: 3,
        comment: 'Admin updated review',
        isHidden: true
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/reviews/${testReview._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.rating).toBe(updateData.rating);
      expect(response.body.data.isHidden).toBe(true);
    });

    it('should fail to update others review', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
      
      const updateData = { comment: 'Unauthorized update' };

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .put(`/api/v1/reviews/${testReview._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to update review as provider', async () => {
      const updateData = { comment: 'Provider update' };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/reviews/${testReview._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with invalid rating', async () => {
      const invalidData = {
        rating: 0 // Invalid rating (min is 1)
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/reviews/${testReview._id}`)
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('DELETE /api/v1/reviews/:id', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should delete own review as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .delete(`/api/v1/reviews/${testReview._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);

      // Verify review is deleted
      const deletedReview = await Review.findById(testReview._id);
      expect(deletedReview).toBeNull();
    });

    it('should delete any review as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .delete(`/api/v1/reviews/${testReview._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
    });

    it('should fail to delete others review', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .delete(`/api/v1/reviews/${testReview._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to delete review as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .delete(`/api/v1/reviews/${testReview._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });
  });

  describe('POST /api/v1/reviews/:id/reply', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should reply to review as provider', async () => {
      const replyData = {
        reply: 'Thank you for your feedback!'
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send(replyData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.providerReply.message).toBe(replyData.reply);
      expect(response.body.data.providerReply.repliedAt).toBeDefined();
    });

    it('should update existing reply', async () => {
      const firstReply = { reply: 'First reply' };
      await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send(firstReply)
        .expect(200);

      const updatedReply = { reply: 'Updated reply' };
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send(updatedReply)
        .expect(200);

      expect(response.body.data.providerReply.message).toBe(updatedReply.reply);
    });

    it('should fail to reply to others review', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();
      
      const replyData = { reply: 'Unauthorized reply' };

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send(replyData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to reply as customer', async () => {
      const replyData = { reply: 'Customer reply' };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send(replyData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should require reply message', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/reply`)
        .send({}) // Missing reply
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/reviews/:id/helpful', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should mark review as helpful', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/helpful`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('marked as helpful');
    });

    it('should unmark review if already marked helpful', async () => {
      // Mark as helpful first
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/helpful`)
        .expect(200);

      // Unmark
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/helpful`)
        .expect(200);

      expect(response.body.message).toContain('unmarked as helpful');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/reviews/${testReview._id}/helpful`)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail for non-existent review', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${nonExistentId}/helpful`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('POST /api/v1/reviews/:id/report', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should report review with valid reason', async () => {
      const reportData = {
        reason: 'inappropriate',
        details: 'Contains offensive language'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send(reportData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('reported');
    });

    it('should fail with invalid reason', async () => {
      const reportData = {
        reason: 'invalid_reason',
        details: 'Test report'
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send(reportData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should require report reason', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send({}) // Missing reason
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should fail without authentication', async () => {
      const reportData = {
        reason: 'spam',
        details: 'Test report'
      };

      const response = await request(app)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send(reportData)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should prevent duplicate reports from same user', async () => {
      const reportData = {
        reason: 'spam',
        details: 'First report'
      };

      // First report
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send(reportData)
        .expect(200);

      // Duplicate report
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send(reportData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/reviews/statistics', () => {
    beforeEach(async () => {
      // Create reviews with different ratings
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        rating: 5,
        comment: 'Excellent'
      });

      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        rating: 4,
        comment: 'Good'
      });

      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        rating: 3,
        comment: 'Average'
      });
    });

    it('should get review statistics without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/statistics')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalReviews).toBe(3);
      expect(response.body.data.averageRating).toBe(4); // (5+4+3)/3 = 4
      expect(response.body.data.ratingDistribution).toBeDefined();
      expect(response.body.data.ratingDistribution[5]).toBe(1);
      expect(response.body.data.ratingDistribution[4]).toBe(1);
      expect(response.body.data.ratingDistribution[3]).toBe(1);
    });

    it('should filter statistics by provider', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/statistics')
        .query({ provider: testProvider._id })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalReviews).toBe(3);
    });

    it('should filter statistics by service', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/statistics')
        .query({ service: testService._id })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalReviews).toBe(3);
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 86400000); // Yesterday
      const endDate = new Date(); // Today

      const response = await request(app)
        .get('/api/v1/reviews/statistics')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(typeof response.body.data.totalReviews).toBe('number');
    });
  });

  describe('GET /api/v1/reviews/my', () => {
    beforeEach(async () => {
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should get customer reviews', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/reviews/my')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].customer).toBe(customerAuth.user._id.toString());
    });

    it('should get provider reviews', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/reviews/my')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/my')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should return empty array for user with no reviews', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get('/api/v1/reviews/my')
        .expect(200);

      expect(response.body.results).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/reviews/pending', () => {
    beforeEach(async () => {
      // Create completed booking without review (pending review)
      await DatabaseHelpers.createBooking({
        customer: customerAuth.user._id,
        service: testService._id,
        provider: testProvider._id,
        status: 'completed',
        completedAt: new Date()
      });
    });

    it('should get pending reviews for customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/reviews/pending')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(2); // testBooking + new booking
      response.body.data.forEach((booking: any) => {
        expect(booking.status).toBe('completed');
        expect(booking.customer).toBe(customerAuth.user._id.toString());
      });
    });

    it('should exclude bookings that already have reviews', async () => {
      // Create review for testBooking
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        rating: 5,
        comment: 'Great service'
      });

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/reviews/pending')
        .expect(200);

      expect(response.body.results).toBe(1); // Only new booking without review
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/pending')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/reviews/pending')
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });
  });

  describe('POST /api/v1/reviews/:id/hide', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });
    });

    it('should hide review as admin', async () => {
      const hideData = {
        reason: 'Inappropriate content'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/hide`)
        .send(hideData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.isHidden).toBe(true);
      expect(response.body.data.hiddenReason).toBe(hideData.reason);
    });

    it('should unhide review as admin', async () => {
      // Hide first
      await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/hide`)
        .send({ reason: 'Test hide' })
        .expect(200);

      // Unhide
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/hide`)
        .send({ reason: null })
        .expect(200);

      expect(response.body.data.isHidden).toBe(false);
      expect(response.body.data.hiddenReason).toBeNull();
    });

    it('should fail as non-admin', async () => {
      const hideData = { reason: 'Unauthorized hide' };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/hide`)
        .send(hideData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should require reason when hiding', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/hide`)
        .send({}) // Missing reason
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/reviews/reports', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        service: testService._id,
        booking: testBooking._id,
        ...testReviews.excellentReview
      });

      // Report the review
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/reviews/${testReview._id}/report`)
        .send({ 
          reason: 'spam',
          details: 'This is spam content'
        })
        .expect(200);
    });

    it('should get reported reviews as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/reviews/reports')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].reports).toHaveLength(1);
      expect(response.body.data[0].reports[0].reason).toBe('spam');
    });

    it('should fail as non-admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/reviews/reports')
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/reports')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should filter reports by status', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get('/api/v1/reviews/reports')
        .query({ status: 'pending' })
        .expect(200);

      response.body.data.forEach((review: any) => {
        review.reports.forEach((report: any) => {
          expect(report.status).toBe('pending');
        });
      });
    });
  });
});
