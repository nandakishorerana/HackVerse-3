import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Deshi Sahayak Hub API',
    version: '1.0.0',
    description: 'API documentation for Deshi Sahayak Hub - Local Home Services Platform',
    contact: {
      name: 'Deshi Sahayak Team',
      email: 'api@deshisahayak.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
    {
      url: 'https://api.deshisahayak.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer {token}',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['name', 'email', 'phone'],
        properties: {
          _id: {
            type: 'string',
            description: 'User ID',
          },
          name: {
            type: 'string',
            description: 'Full name of the user',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
          },
          phone: {
            type: 'string',
            description: 'Phone number',
          },
          role: {
            type: 'string',
            enum: ['customer', 'provider', 'admin'],
            description: 'User role',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              pincode: { type: 'string' },
              coordinates: {
                type: 'object',
                properties: {
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      ServiceProvider: {
        type: 'object',
        required: ['user', 'services', 'experience'],
        properties: {
          _id: {
            type: 'string',
            description: 'Service provider ID',
          },
          user: {
            type: 'string',
            description: 'Reference to User object',
          },
          services: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of service IDs this provider offers',
          },
          experience: {
            type: 'number',
            description: 'Years of experience',
          },
          hourlyRate: {
            type: 'number',
            description: 'Hourly rate in INR',
          },
          availability: {
            type: 'object',
            description: 'Weekly availability schedule',
          },
          rating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Average rating',
          },
          totalReviews: {
            type: 'number',
            description: 'Total number of reviews',
          },
          isVerified: {
            type: 'boolean',
            description: 'Whether the provider is verified',
          },
        },
      },
      Service: {
        type: 'object',
        required: ['name', 'category', 'description', 'basePrice'],
        properties: {
          _id: {
            type: 'string',
            description: 'Service ID',
          },
          name: {
            type: 'string',
            description: 'Service name',
          },
          category: {
            type: 'string',
            description: 'Service category',
          },
          description: {
            type: 'string',
            description: 'Service description',
          },
          basePrice: {
            type: 'number',
            description: 'Base price in INR',
          },
          duration: {
            type: 'number',
            description: 'Estimated duration in minutes',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the service is active',
          },
        },
      },
      Booking: {
        type: 'object',
        required: ['customer', 'provider', 'service', 'scheduledDate', 'address'],
        properties: {
          _id: {
            type: 'string',
            description: 'Booking ID',
          },
          customer: {
            type: 'string',
            description: 'Reference to Customer User ID',
          },
          provider: {
            type: 'string',
            description: 'Reference to Service Provider ID',
          },
          service: {
            type: 'string',
            description: 'Reference to Service ID',
          },
          scheduledDate: {
            type: 'string',
            format: 'date-time',
            description: 'Scheduled date and time for service',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              pincode: { type: 'string' },
            },
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
            description: 'Booking status',
          },
          totalAmount: {
            type: 'number',
            description: 'Total amount in INR',
          },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'paid', 'failed', 'refunded'],
            description: 'Payment status',
          },
        },
      },
      Review: {
        type: 'object',
        required: ['booking', 'customer', 'provider', 'rating'],
        properties: {
          _id: {
            type: 'string',
            description: 'Review ID',
          },
          booking: {
            type: 'string',
            description: 'Reference to Booking ID',
          },
          customer: {
            type: 'string',
            description: 'Reference to Customer User ID',
          },
          provider: {
            type: 'string',
            description: 'Reference to Service Provider ID',
          },
          rating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: 'Rating from 1 to 5',
          },
          comment: {
            type: 'string',
            description: 'Review comment',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            description: 'Success message',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Service Providers',
      description: 'Service provider management endpoints',
    },
    {
      name: 'Services',
      description: 'Service catalog endpoints',
    },
    {
      name: 'Bookings',
      description: 'Booking management endpoints',
    },
    {
      name: 'Reviews',
      description: 'Review and rating endpoints',
    },
    {
      name: 'Payments',
      description: 'Payment processing endpoints',
    },
    {
      name: 'Admin',
      description: 'Admin-only endpoints',
    },
    {
      name: 'Notifications',
      description: 'Notification endpoints',
    },
  ],
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
  ],
};

export default swaggerOptions;
