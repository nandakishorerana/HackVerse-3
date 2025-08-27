// MongoDB initialization script for Docker setup
// This script creates the database and sets up initial configurations

// Switch to the target database
db = db.getSiblingDB('deshi-sahayak-hub');

// Create initial collections with indexes
db.createCollection('users');
db.createCollection('serviceproviders');
db.createCollection('services');
db.createCollection('bookings');
db.createCollection('reviews');
db.createCollection('notifications');
db.createCollection('payments');

// Create indexes for better performance

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });
db.users.createIndex({ "city": 1 });

// Service providers collection indexes
db.serviceproviders.createIndex({ "userId": 1 }, { unique: true });
db.serviceproviders.createIndex({ "services": 1 });
db.serviceproviders.createIndex({ "city": 1 });
db.serviceproviders.createIndex({ "rating": -1 });
db.serviceproviders.createIndex({ "isVerified": 1 });

// Services collection indexes
db.services.createIndex({ "category": 1 });
db.services.createIndex({ "isActive": 1 });
db.services.createIndex({ "name": "text", "description": "text" });

// Bookings collection indexes
db.bookings.createIndex({ "customerId": 1 });
db.bookings.createIndex({ "providerId": 1 });
db.bookings.createIndex({ "serviceId": 1 });
db.bookings.createIndex({ "status": 1 });
db.bookings.createIndex({ "scheduledDate": 1 });
db.bookings.createIndex({ "createdAt": -1 });

// Reviews collection indexes
db.reviews.createIndex({ "bookingId": 1 }, { unique: true });
db.reviews.createIndex({ "providerId": 1 });
db.reviews.createIndex({ "customerId": 1 });

// Notifications collection indexes
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "createdAt": -1 });
db.notifications.createIndex({ "isRead": 1 });

// Payments collection indexes
db.payments.createIndex({ "bookingId": 1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "paymentMethod": 1 });

// Insert default service categories
db.services.insertMany([
  {
    name: "House Cleaning",
    category: "cleaning",
    description: "Professional house cleaning services",
    basePrice: 500,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "Plumbing Repair",
    category: "plumbing",
    description: "Professional plumbing repair and maintenance",
    basePrice: 800,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "Electrical Work",
    category: "electrical",
    description: "Electrical installation and repair services",
    basePrice: 600,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "Carpentry",
    category: "carpentry",
    description: "Custom carpentry and furniture repair",
    basePrice: 1000,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "Painting",
    category: "painting",
    description: "Interior and exterior painting services",
    basePrice: 1200,
    isActive: true,
    createdAt: new Date()
  }
]);

print("Database initialization completed successfully!");
print("Created collections with indexes and default service categories.");
