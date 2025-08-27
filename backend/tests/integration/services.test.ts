import request from 'supertest';
import app from '@/server';
import { Service } from '@/models/Service';
import { 
  TestDataFactory, 
  DatabaseHelpers, 
  AuthHelpers, 
  ApiHelpers 
} from '../utils/testHelpers';
import { testServices } from '../fixtures/testData';

describe('Services API', () => {
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

  describe('GET /api/v1/services', () => {
    beforeEach(async () => {
      // Create test services
      await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
      await DatabaseHelpers.createService(testProvider._id, testServices.electricalRepair);
      await DatabaseHelpers.createService(testProvider._id, testServices.plumbing);
    });

    it('should get all services without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter services by category', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ category: 'Home Services' })
        .expect(200);

      expect(response.body.results).toBe(3);
      response.body.data.forEach((service: any) => {
        expect(service.category).toBe('Home Services');
      });
    });

    it('should filter services by price range', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ minPrice: 600, maxPrice: 1000 })
        .expect(200);

      response.body.data.forEach((service: any) => {
        expect(service.price).toBeGreaterThanOrEqual(600);
        expect(service.price).toBeLessThanOrEqual(1000);
      });
    });

    it('should search services by name', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ search: 'cleaning' })
        .expect(200);

      expect(response.body.results).toBeGreaterThan(0);
      response.body.data.forEach((service: any) => {
        expect(service.name.toLowerCase()).toContain('cleaning');
      });
    });

    it('should sort services by price', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ sortBy: 'price', sortOrder: 'asc' })
        .expect(200);

      const prices = response.body.data.map((service: any) => service.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/services')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.results).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });

    it('should only return active services', async () => {
      // Create inactive service
      await DatabaseHelpers.createService(testProvider._id, testServices.inactiveService);

      const response = await request(app)
        .get('/api/v1/services')
        .expect(200);

      // Should only return 3 active services, not the inactive one
      expect(response.body.results).toBe(3);
      response.body.data.forEach((service: any) => {
        expect(service.isActive).toBe(true);
      });
    });
  });

  describe('GET /api/v1/services/:id', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
    });

    it('should get service by ID without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/services/${testService._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testService._id.toString());
      expect(response.body.data.name).toBe(testServices.homeCleaning.name);
      expect(response.body.data.provider).toBeDefined();
    });

    it('should increment view count when service is viewed', async () => {
      await request(app)
        .get(`/api/v1/services/${testService._id}`)
        .expect(200);

      const updatedService = await Service.findById(testService._id);
      expect(updatedService?.viewCount).toBe(1);
    });

    it('should return 404 for non-existent service', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/v1/services/${nonExistentId}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/v1/services/invalid-id')
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should return 404 for inactive service', async () => {
      const inactiveService = await DatabaseHelpers.createService(testProvider._id, testServices.inactiveService);

      const response = await request(app)
        .get(`/api/v1/services/${inactiveService._id}`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('POST /api/v1/services', () => {
    it('should create service as provider', async () => {
      const serviceData = TestDataFactory.createServiceData(testProvider._id);

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post('/api/v1/services')
        .send(serviceData)
        .expect(201);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.name).toBe(serviceData.name);
      expect(response.body.data.provider).toBe(testProvider._id.toString());
      expect(response.body.data.isActive).toBe(true);
    });

    it('should fail to create service as customer', async () => {
      const serviceData = TestDataFactory.createServiceData(testProvider._id);

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post('/api/v1/services')
        .send(serviceData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail without authentication', async () => {
      const serviceData = TestDataFactory.createServiceData(testProvider._id);

      const response = await request(app)
        .post('/api/v1/services')
        .send(serviceData)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        price: -100, // Negative price
        duration: 0 // Zero duration
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post('/api/v1/services')
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });

    it('should set provider automatically from authenticated user', async () => {
      const serviceData = {
        name: 'Test Service',
        description: 'Test description',
        category: 'Home Services',
        subcategory: 'Cleaning',
        price: 1000,
        duration: 120
        // Note: not providing providerId in request
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .post('/api/v1/services')
        .send(serviceData)
        .expect(201);

      expect(response.body.data.provider).toBe(testProvider._id.toString());
    });
  });

  describe('PUT /api/v1/services/:id', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
    });

    it('should update own service as provider', async () => {
      const updateData = {
        name: 'Updated Service Name',
        price: 2000
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/services/${testService._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should update any service as admin', async () => {
      const updateData = {
        name: 'Admin Updated Service',
        isActive: false
      };

      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .put(`/api/v1/services/${testService._id}`)
        .send(updateData)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should fail to update others service as provider', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();
      
      const updateData = { name: 'Unauthorized Update' };

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .put(`/api/v1/services/${testService._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to update service as customer', async () => {
      const updateData = { name: 'Customer Update' };

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .put(`/api/v1/services/${testService._id}`)
        .send(updateData)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        price: -500, // Negative price
        duration: -60 // Negative duration
      };

      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .put(`/api/v1/services/${testService._id}`)
        .send(invalidData)
        .expect(400);

      ApiHelpers.expectValidationError(response);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
    });

    it('should delete own service as provider', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, providerAuth.token)
        .delete(`/api/v1/services/${testService._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);

      // Verify service is deleted (soft delete)
      const deletedService = await Service.findById(testService._id);
      expect(deletedService?.isActive).toBe(false);
    });

    it('should delete any service as admin', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, adminAuth.token)
        .delete(`/api/v1/services/${testService._id}`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
    });

    it('should fail to delete others service as provider', async () => {
      const otherProviderAuth = await AuthHelpers.createAuthenticatedProvider();

      const response = await ApiHelpers.authenticatedRequest(app, otherProviderAuth.token)
        .delete(`/api/v1/services/${testService._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });

    it('should fail to delete service as customer', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .delete(`/api/v1/services/${testService._id}`)
        .expect(403);

      ApiHelpers.expectForbiddenError(response);
    });
  });

  describe('GET /api/v1/services/categories', () => {
    beforeEach(async () => {
      await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
      await DatabaseHelpers.createService(testProvider._id, testServices.electricalRepair);
    });

    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/v1/services/categories')
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data).toContain('Home Services');
    });

    it('should include subcategories', async () => {
      const response = await request(app)
        .get('/api/v1/services/categories')
        .query({ includeSubcategories: true })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data['Home Services']).toContain('Cleaning');
      expect(response.body.data['Home Services']).toContain('Electrical');
    });
  });

  describe('GET /api/v1/services/recommendations', () => {
    beforeEach(async () => {
      await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
      await DatabaseHelpers.createService(testProvider._id, testServices.electricalRepair);
      await DatabaseHelpers.createService(testProvider._id, testServices.plumbing);
    });

    it('should get popular services', async () => {
      const response = await request(app)
        .get('/api/v1/services/recommendations')
        .query({ type: 'popular' })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get nearby services with location', async () => {
      const response = await request(app)
        .get('/api/v1/services/recommendations')
        .query({ 
          type: 'nearby',
          city: 'Test City'
        })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get trending services', async () => {
      const response = await request(app)
        .get('/api/v1/services/recommendations')
        .query({ type: 'trending' })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get similar services for authenticated user', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/services/recommendations')
        .query({ type: 'similar' })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/services/search/suggestions', () => {
    beforeEach(async () => {
      await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
      await DatabaseHelpers.createService(testProvider._id, testServices.electricalRepair);
    });

    it('should get search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/services/search/suggestions')
        .query({ q: 'clean' })
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.data.services).toBeInstanceOf(Array);
      expect(response.body.data.categories).toBeInstanceOf(Array);
      expect(response.body.data.providers).toBeInstanceOf(Array);
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/v1/services/search/suggestions')
        .expect(400);

      ApiHelpers.expectValidationError(response, 'q');
    });

    it('should limit suggestions count', async () => {
      const response = await request(app)
        .get('/api/v1/services/search/suggestions')
        .query({ q: 'service', limit: 3 })
        .expect(200);

      expect(response.body.data.services.length).toBeLessThanOrEqual(3);
    });
  });

  describe('POST /api/v1/services/:id/favorite', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
    });

    it('should add service to favorites', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/services/${testService._id}/favorite`)
        .expect(200);

      ApiHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('added to favorites');
    });

    it('should remove service from favorites if already favorited', async () => {
      // Add to favorites first
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/services/${testService._id}/favorite`)
        .expect(200);

      // Try to add again - should remove
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/services/${testService._id}/favorite`)
        .expect(200);

      expect(response.body.message).toContain('removed from favorites');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/services/${testService._id}/favorite`)
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should fail for non-existent service', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/services/${nonExistentId}/favorite`)
        .expect(404);

      ApiHelpers.expectNotFoundError(response);
    });
  });

  describe('GET /api/v1/services/favorites', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await DatabaseHelpers.createService(testProvider._id, testServices.homeCleaning);
      
      // Add service to favorites
      await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .post(`/api/v1/services/${testService._id}/favorite`)
        .expect(200);
    });

    it('should get user favorites', async () => {
      const response = await ApiHelpers.authenticatedRequest(app, customerAuth.token)
        .get('/api/v1/services/favorites')
        .expect(200);

      ApiHelpers.expectPaginatedResponse(response);
      expect(response.body.results).toBe(1);
      expect(response.body.data[0]._id).toBe(testService._id.toString());
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/services/favorites')
        .expect(401);

      ApiHelpers.expectUnauthorizedError(response);
    });

    it('should return empty array for user with no favorites', async () => {
      const otherCustomerAuth = await AuthHelpers.createAuthenticatedUser({ role: 'customer' });

      const response = await ApiHelpers.authenticatedRequest(app, otherCustomerAuth.token)
        .get('/api/v1/services/favorites')
        .expect(200);

      expect(response.body.results).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });
});
