import request from 'supertest';
import app from '@/server';
import { Provider } from '@/models/Provider';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testProviders } from '../fixtures/testData';

describe('Providers API', () => {
  let customerAuth: any;
  let providerAuth: any;
  let adminAuth: any;
  let testProvider: any;

  beforeEach(async () => {
    await DatabaseHelpers.clearDatabase();
    
    // Create authenticated users
    customerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });
    providerAuth = await AuthHelpers.createAuthenticatedProvider();
    adminAuth = await AuthHelpers.createAuthenticatedAdmin();
    testProvider = providerAuth.provider;
  });

  describe('GET /api/v1/providers', () => {
    beforeEach(async () => {
      // Create additional test providers
      await DatabaseHelpers.createProvider(testProviders.verifiedProvider);
      await DatabaseHelpers.createProvider(testProviders.unverifiedProvider);
    });

    it('should get all verified providers without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBeGreaterThan(0);
      response.body.data.forEach((provider: any) => {
        expect(provider.isVerified).toBe(true);
      });
    });

    it('should filter providers by city', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .query({ city: 'Test City' })
        .expect(200);

      response.body.data.forEach((provider: any) => {
        expect(provider.location.city).toBe('Test City');
      });
    });

    it('should filter providers by service category', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .query({ serviceCategory: 'Home Services' })
        .expect(200);

      response.body.data.forEach((provider: any) => {
        expect(provider.serviceCategories).toContain('Home Services');
      });
    });

    it('should sort providers by rating', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .query({ sortBy: 'rating', sortOrder: 'desc' })
        .expect(200);

      const ratings = response.body.data.map((provider: any) => provider.rating.average);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it('should search providers by business name', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .query({ search: 'Test' })
        .expect(200);

      response.body.data.forEach((provider: any) => {
        expect(
          provider.businessName.toLowerCase().includes('test') ||
          provider.services.some((service: any) => 
            service.name.toLowerCase().includes('test')
          )
        ).toBe(true);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/providers')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.results).toBeLessThanOrEqual(2);
      expect(response.body.page).toBe(1);
    });
  });

  describe('GET /api/v1/providers/:id', () => {
    it('should get provider by ID without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testProvider._id.toString());
      expect(response.body.data.businessName).toBe(testProvider.businessName);
      expect(response.body.data.services).toBeDefined();
    });

    it('should increment view count when provider is viewed', async () => {
      await request(app)
        .get(`/api/v1/providers/${testProvider._id}`)
        .expect(200);

      const updatedProvider = await Provider.findById(testProvider._id);
      expect(updatedProvider?.viewCount).toBe(1);
    });

    it('should return 404 for non-existent provider', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/v1/providers/${nonExistentId}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should return 404 for unverified provider', async () => {
      const unverifiedProvider = await DatabaseHelpers.createProvider({
        ...testProviders.unverifiedProvider,
        isVerified: false
      });

      const response = await request(app)
        .get(`/api/v1/providers/${unverifiedProvider._id}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('PUT /api/v1/providers/:id', () => {
    it('should update own provider profile', async () => {
      const updateData = {
        businessName: 'Updated Business Name',
        description: 'Updated description',
        serviceCategories: ['Home Services', 'Personal Services']
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.businessName).toBe(updateData.businessName);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should update any provider as admin', async () => {
      const updateData = {
        businessName: 'Admin Updated Name',
        isVerified: false
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/providers/${testProvider._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.businessName).toBe(updateData.businessName);
      expect(response.body.data.isVerified).toBe(false);
    });

    it('should fail to update others provider profile', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();
      
      const updateData = { businessName: 'Unauthorized Update' };

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .put(`/api/v1/providers/${testProvider._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to update provider as customer', async () => {
      const updateData = { businessName: 'Customer Update' };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        businessName: '', // Empty business name
        yearsOfExperience: -1 // Negative experience
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}`)
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/providers/:id/verify', () => {
    let unverifiedProvider: any;

    beforeEach(async () => {
      unverifiedProvider = await DatabaseHelpers.createProvider({
        ...testProviders.unverifiedProvider,
        isVerified: false
      });
    });

    it('should verify provider as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/providers/${unverifiedProvider._id}/verify`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.isVerified).toBe(true);
      expect(response.body.data.verifiedAt).toBeDefined();
    });

    it('should fail to verify provider as non-admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/providers/${unverifiedProvider._id}/verify`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail for already verified provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/providers/${testProvider._id}/verify`)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/v1/providers/:id/reject', () => {
    let unverifiedProvider: any;

    beforeEach(async () => {
      unverifiedProvider = await DatabaseHelpers.createProvider({
        ...testProviders.unverifiedProvider,
        isVerified: false
      });
    });

    it('should reject provider as admin', async () => {
      const rejectionData = {
        reason: 'Incomplete documentation'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/providers/${unverifiedProvider._id}/reject`)
        .send(rejectionData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.verificationStatus).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe(rejectionData.reason);
    });

    it('should fail to reject provider as non-admin', async () => {
      const rejectionData = { reason: 'Test rejection' };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post(`/api/v1/providers/${unverifiedProvider._id}/reject`)
        .send(rejectionData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should require rejection reason', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .post(`/api/v1/providers/${unverifiedProvider._id}/reject`)
        .send({}) // Missing reason
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/providers/:id/services', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, {
        name: 'Provider Service',
        category: 'Home Services',
        subcategory: 'Cleaning',
        price: 1000
      });
    });

    it('should get provider services without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/services`)
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should only return active services', async () => {
      // Create inactive service
      await DatabaseHelpers.createService(testProvider._id, {
        name: 'Inactive Service',
        category: 'Home Services',
        subcategory: 'Repair',
        price: 500,
        isActive: false
      });

      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/services`)
        .expect(200);

      expect(response.body.results).toBe(1); // Only active service
      response.body.data.forEach((service: any) => {
        expect(service.isActive).toBe(true);
      });
    });

    it('should filter services by category', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/services`)
        .query({ category: 'Home Services' })
        .expect(200);

      response.body.data.forEach((service: any) => {
        expect(service.category).toBe('Home Services');
      });
    });
  });

  describe('GET /api/v1/providers/:id/reviews', () => {
    beforeEach(async () => {
      // Create test review
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        rating: 5,
        comment: 'Excellent service!'
      });
    });

    it('should get provider reviews without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/reviews`)
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0].provider).toBe(testProvider._id.toString());
    });

    it('should sort reviews by newest first', async () => {
      // Create older review
      await DatabaseHelpers.createReview({
        customer: customerAuth.user._id,
        provider: testProvider._id,
        rating: 4,
        comment: 'Good service',
        createdAt: new Date(Date.now() - 86400000) // Yesterday
      });

      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/reviews`)
        .expect(200);

      expect(response.body.results).toBe(2);
      
      // Should be sorted by newest first
      const dates = response.body.data.map((review: any) => new Date(review.createdAt));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should filter reviews by rating', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/reviews`)
        .query({ rating: 5 })
        .expect(200);

      response.body.data.forEach((review: any) => {
        expect(review.rating).toBe(5);
      });
    });
  });

  describe('GET /api/v1/providers/:id/availability', () => {
    beforeEach(async () => {
      // Update provider with availability
      await Provider.findByIdAndUpdate(testProvider._id, {
        availability: {
          monday: { isAvailable: true, slots: ['09:00', '10:00', '11:00'] },
          tuesday: { isAvailable: true, slots: ['09:00', '10:00'] },
          wednesday: { isAvailable: false, slots: [] }
        }
      });
    });

    it('should get provider availability', async () => {
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/availability`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.monday.isAvailable).toBe(true);
      expect(response.body.data.monday.slots).toHaveLength(3);
      expect(response.body.data.wednesday.isAvailable).toBe(false);
    });

    it('should get availability for specific date', async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      
      const response = await request(app)
        .get(`/api/v1/providers/${testProvider._id}/availability`)
        .query({ date: tomorrow.toISOString().split('T')[0] })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.slots).toBeDefined();
    });
  });

  describe('PUT /api/v1/providers/:id/availability', () => {
    it('should update availability as provider', async () => {
      const availabilityData = {
        monday: { isAvailable: true, slots: ['09:00', '10:00', '14:00', '15:00'] },
        tuesday: { isAvailable: true, slots: ['10:00', '11:00', '16:00'] },
        wednesday: { isAvailable: false, slots: [] }
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/availability`)
        .send(availabilityData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.availability.monday.slots).toHaveLength(4);
      expect(response.body.data.availability.wednesday.isAvailable).toBe(false);
    });

    it('should fail to update others availability', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();
      
      const availabilityData = {
        monday: { isAvailable: true, slots: ['09:00'] }
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/availability`)
        .send(availabilityData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail as customer', async () => {
      const availabilityData = {
        monday: { isAvailable: true, slots: ['09:00'] }
      };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/availability`)
        .send(availabilityData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should validate slot format', async () => {
      const invalidData = {
        monday: { 
          isAvailable: true, 
          slots: ['25:00', 'invalid-time'] // Invalid time formats
        }
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/availability`)
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/v1/providers/:id/statistics', () => {
    beforeEach(async () => {
      // Create bookings and reviews for statistics
      await DatabaseHelpers.createBooking({
        provider: testProvider._id,
        customer: customerAuth.user._id,
        status: 'completed'
      });

      await DatabaseHelpers.createReview({
        provider: testProvider._id,
        customer: customerAuth.user._id,
        rating: 5
      });
    });

    it('should get provider statistics as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get(`/api/v1/providers/${testProvider._id}/statistics`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalBookings).toBe(1);
      expect(response.body.data.completedBookings).toBe(1);
      expect(response.body.data.totalReviews).toBe(1);
      expect(response.body.data.averageRating).toBe(5);
    });

    it('should get basic statistics as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get(`/api/v1/providers/${testProvider._id}/statistics`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalBookings).toBe(1);
      expect(response.body.data.averageRating).toBe(5);
      // Should not include sensitive provider data for customers
      expect(response.body.data.revenue).toBeUndefined();
    });

    it('should get full statistics as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .get(`/api/v1/providers/${testProvider._id}/statistics`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.totalBookings).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 86400000); // Yesterday
      const endDate = new Date(); // Today

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get(`/api/v1/providers/${testProvider._id}/statistics`)
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(typeof response.body.data.totalBookings).toBe('number');
    });
  });

  describe('GET /api/v1/providers/nearby', () => {
    beforeEach(async () => {
      // Create providers with different locations
      await DatabaseHelpers.createProvider({
        ...testProviders.verifiedProvider,
        location: {
          street: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          coordinates: { latitude: 40.7128, longitude: -74.0060 }
        }
      });
    });

    it('should find nearby providers', async () => {
      const response = await request(app)
        .get('/api/v1/providers/nearby')
        .query({
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10 // 10 km
        })
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require location parameters', async () => {
      const response = await request(app)
        .get('/api/v1/providers/nearby')
        .query({ latitude: 40.7128 }) // Missing longitude
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should filter by service category', async () => {
      const response = await request(app)
        .get('/api/v1/providers/nearby')
        .query({
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10,
          serviceCategory: 'Home Services'
        })
        .expect(200);

      response.body.data.forEach((provider: any) => {
        expect(provider.serviceCategories).toContain('Home Services');
      });
    });
  });

  describe('POST /api/v1/providers/:id/follow', () => {
    it('should follow provider as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/providers/${testProvider._id}/follow`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('following');
    });

    it('should unfollow provider if already following', async () => {
      // Follow first
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/providers/${testProvider._id}/follow`)
        .expect(200);

      // Unfollow
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/providers/${testProvider._id}/follow`)
        .expect(200);

      expect(response.body.message).toContain('unfollowing');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/providers/${testProvider._id}/follow`)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail for non-existent provider', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/providers/${nonExistentId}/follow`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('GET /api/v1/providers/following', () => {
    beforeEach(async () => {
      // Follow the test provider
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/providers/${testProvider._id}/follow`)
        .expect(200);
    });

    it('should get followed providers', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/providers/following')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0]._id).toBe(testProvider._id.toString());
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/providers/following')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should return empty array for user with no followed providers', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get('/api/v1/providers/following')
        .expect(200);

      expect(response.body.results).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/v1/providers/:id/documents', () => {
    it('should update provider documents', async () => {
      const documentsData = {
        businessLicense: 'license123.pdf',
        identityProof: 'id456.pdf',
        addressProof: 'address789.pdf'
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/documents`)
        .send(documentsData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.documents.businessLicense).toBe(documentsData.businessLicense);
      expect(response.body.data.documents.identityProof).toBe(documentsData.identityProof);
    });

    it('should fail to update others documents', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();
      
      const documentsData = {
        businessLicense: 'unauthorized.pdf'
      };

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/documents`)
        .send(documentsData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should update documents as admin', async () => {
      const documentsData = {
        businessLicense: 'admin_updated.pdf',
        verificationNotes: 'Updated by admin'
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/providers/${testProvider._id}/documents`)
        .send(documentsData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.documents.businessLicense).toBe(documentsData.businessLicense);
    });
  });

  describe('GET /api/v1/providers/dashboard', () => {
    beforeEach(async () => {
      // Create dashboard data
      await DatabaseHelpers.createBooking({
        provider: testProvider._id,
        customer: customerAuth.user._id,
        status: 'pending'
      });

      await DatabaseHelpers.createReview({
        provider: testProvider._id,
        customer: customerAuth.user._id,
        rating: 5
      });
    });

    it('should get provider dashboard data', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .get('/api/v1/providers/dashboard')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.pendingBookings).toBe(1);
      expect(response.body.data.totalBookings).toBe(1);
      expect(response.body.data.totalReviews).toBe(1);
      expect(response.body.data.averageRating).toBe(5);
      expect(response.body.data.recentBookings).toBeInstanceOf(Array);
      expect(response.body.data.recentReviews).toBeInstanceOf(Array);
    });

    it('should fail for non-provider users', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/providers/dashboard')
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/providers/dashboard')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });
  });
});
