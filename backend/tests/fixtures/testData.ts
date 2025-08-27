// Test fixtures for consistent test data

export const testUsers = {
  customer: {
    name: 'John Customer',
    email: 'customer@test.com',
    phone: '9876543210',
    password: 'password123',
    role: 'customer' as const,
    isVerified: true,
    isActive: true,
    addresses: [
      {
        type: 'home',
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        landmark: 'Near Test Mall'
      }
    ]
  },
  
  provider: {
    name: 'Jane Provider',
    email: 'provider@test.com',
    phone: '9876543211',
    password: 'password123',
    bio: 'Professional service provider with 5+ years experience',
    experience: 5,
    services: ['Home Cleaning', 'Deep Cleaning'],
    certifications: ['Professional Cleaning Certificate'],
    address: {
      type: 'work',
      street: '456 Business Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    isVerified: true,
    isActive: true
  },
  
  admin: {
    name: 'Admin User',
    email: 'admin@test.com',
    phone: '9876543212',
    password: 'password123',
    role: 'admin' as const,
    isVerified: true,
    isActive: true
  },
  
  unverifiedCustomer: {
    name: 'Unverified Customer',
    email: 'unverified@test.com',
    phone: '9876543213',
    password: 'password123',
    role: 'customer' as const,
    isVerified: false,
    isActive: true
  },
  
  inactiveProvider: {
    name: 'Inactive Provider',
    email: 'inactive@test.com',
    phone: '9876543214',
    password: 'password123',
    bio: 'Inactive service provider',
    experience: 2,
    services: ['Test Service'],
    isVerified: true,
    isActive: false
  }
};

export const testServices = {
  homeCleaning: {
    name: 'Home Deep Cleaning',
    description: 'Comprehensive deep cleaning service for your entire home',
    category: 'Home Services',
    subcategory: 'Cleaning',
    price: 1500,
    duration: 240,
    images: [
      'https://res.cloudinary.com/test/image/upload/cleaning1.jpg',
      'https://res.cloudinary.com/test/image/upload/cleaning2.jpg'
    ],
    tags: ['deep cleaning', 'home cleaning', 'sanitization'],
    isActive: true
  },
  
  electricalRepair: {
    name: 'Electrical Repair Service',
    description: 'Professional electrical repair and maintenance',
    category: 'Home Services',
    subcategory: 'Electrical',
    price: 500,
    duration: 120,
    images: ['https://res.cloudinary.com/test/image/upload/electrical.jpg'],
    tags: ['electrical', 'repair', 'maintenance'],
    isActive: true
  },
  
  plumbing: {
    name: 'Plumbing Service',
    description: 'Complete plumbing solutions for your home',
    category: 'Home Services',
    subcategory: 'Plumbing',
    price: 800,
    duration: 180,
    images: ['https://res.cloudinary.com/test/image/upload/plumbing.jpg'],
    tags: ['plumbing', 'pipes', 'water'],
    isActive: true
  },
  
  inactiveService: {
    name: 'Inactive Service',
    description: 'This service is no longer active',
    category: 'Home Services',
    subcategory: 'Other',
    price: 1000,
    duration: 120,
    isActive: false
  }
};

export const testBookings = {
  pending: {
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'pending' as const,
    address: {
      type: 'home',
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    serviceAmount: 1500,
    platformFee: 75,
    gstAmount: 270,
    totalAmount: 1845,
    specialInstructions: 'Please bring eco-friendly products'
  },
  
  confirmed: {
    scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
    status: 'confirmed' as const,
    address: {
      type: 'home',
      street: '456 Another Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    serviceAmount: 800,
    platformFee: 40,
    gstAmount: 144,
    totalAmount: 984
  },
  
  completed: {
    scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    status: 'completed' as const,
    address: {
      type: 'work',
      street: '789 Office Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    serviceAmount: 500,
    platformFee: 25,
    gstAmount: 90,
    totalAmount: 615,
    workSummary: {
      workDescription: 'Fixed electrical outlets and switches',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    payment: {
      method: 'razorpay',
      status: 'completed',
      transactionId: 'txn_test123',
      paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  },
  
  cancelled: {
    scheduledDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // In 3 days
    status: 'cancelled' as const,
    address: {
      type: 'home',
      street: '321 Cancelled Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    serviceAmount: 1000,
    platformFee: 50,
    gstAmount: 180,
    totalAmount: 1230,
    cancellationReason: 'Customer request',
    cancelledAt: new Date()
  }
};

export const testReviews = {
  excellentReview: {
    rating: 5,
    comment: 'Excellent service! Very professional and thorough. Highly recommended.',
    images: [
      'https://res.cloudinary.com/test/image/upload/review1.jpg',
      'https://res.cloudinary.com/test/image/upload/review2.jpg'
    ],
    status: 'active' as const
  },
  
  goodReview: {
    rating: 4,
    comment: 'Good service overall. Quick and efficient work.',
    images: [],
    status: 'active' as const
  },
  
  averageReview: {
    rating: 3,
    comment: 'Service was okay, could be better.',
    images: [],
    status: 'active' as const
  },
  
  poorReview: {
    rating: 2,
    comment: 'Service was not up to expectations.',
    images: [],
    status: 'active' as const
  },
  
  reportedReview: {
    rating: 1,
    comment: 'Terrible service! Completely unprofessional!',
    images: [],
    status: 'reported' as const,
    reports: [
      {
        reason: 'inappropriate',
        description: 'Contains inappropriate language',
        reportedAt: new Date()
      }
    ]
  },
  
  reviewWithResponse: {
    rating: 4,
    comment: 'Good service but could improve communication.',
    images: [],
    status: 'active' as const,
    providerResponse: {
      response: 'Thank you for your feedback. We will improve our communication.',
      respondedAt: new Date()
    }
  }
};

export const testNotifications = {
  bookingCreated: {
    type: 'booking' as const,
    title: 'Booking Created',
    message: 'Your booking has been created successfully',
    priority: 'normal' as const,
    channels: ['in_app', 'email'] as const,
    status: 'sent' as const
  },
  
  bookingConfirmed: {
    type: 'booking' as const,
    title: 'Booking Confirmed',
    message: 'Your booking has been confirmed by the service provider',
    priority: 'high' as const,
    channels: ['in_app', 'email', 'sms'] as const,
    status: 'delivered' as const,
    deliveredAt: new Date()
  },
  
  paymentSuccess: {
    type: 'payment' as const,
    title: 'Payment Successful',
    message: 'Your payment has been processed successfully',
    priority: 'high' as const,
    channels: ['in_app', 'email', 'sms'] as const,
    status: 'delivered' as const,
    deliveredAt: new Date()
  },
  
  systemAnnouncement: {
    type: 'system' as const,
    title: 'System Maintenance',
    message: 'Scheduled system maintenance on Sunday 2 AM',
    priority: 'normal' as const,
    channels: ['in_app', 'email'] as const,
    status: 'scheduled' as const,
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  
  promotionalOffer: {
    type: 'promotion' as const,
    title: 'Special Offer!',
    message: 'Get 20% off on your next booking',
    priority: 'low' as const,
    channels: ['in_app'] as const,
    status: 'sent' as const
  },
  
  providerVerification: {
    type: 'provider' as const,
    title: 'Account Verified',
    message: 'Congratulations! Your account has been verified',
    priority: 'high' as const,
    channels: ['in_app', 'email', 'sms'] as const,
    status: 'delivered' as const,
    deliveredAt: new Date()
  }
};

export const testPayments = {
  razorpayOrder: {
    id: 'order_test123456',
    amount: 184500, // in paise
    currency: 'INR',
    status: 'created',
    receipt: 'booking_test123'
  },
  
  razorpayPayment: {
    id: 'pay_test123456',
    order_id: 'order_test123456',
    amount: 184500,
    currency: 'INR',
    status: 'captured',
    method: 'card'
  },
  
  paymentSignature: {
    razorpay_order_id: 'order_test123456',
    razorpay_payment_id: 'pay_test123456',
    razorpay_signature: 'test_signature_hash'
  },
  
  refundData: {
    id: 'rfnd_test123456',
    payment_id: 'pay_test123456',
    amount: 184500,
    currency: 'INR',
    status: 'processed'
  }
};

export const testErrors = {
  validation: {
    success: false,
    message: 'Validation failed',
    statusCode: 400
  },
  
  unauthorized: {
    success: false,
    message: 'Authentication required. Please login.',
    statusCode: 401
  },
  
  forbidden: {
    success: false,
    message: 'You do not have permission to access this resource',
    statusCode: 403
  },
  
  notFound: {
    success: false,
    message: 'Resource not found',
    statusCode: 404
  },
  
  serverError: {
    success: false,
    message: 'Internal server error',
    statusCode: 500
  }
};

export const testApiResponses = {
  success: {
    success: true,
    message: 'Operation completed successfully'
  },
  
  paginated: {
    success: true,
    results: 10,
    total: 100,
    page: 1,
    totalPages: 10
  },
  
  created: {
    success: true,
    message: 'Resource created successfully'
  },
  
  updated: {
    success: true,
    message: 'Resource updated successfully'
  },
  
  deleted: {
    success: true,
    message: 'Resource deleted successfully'
  }
};

// Helper function to get test data with overrides
export function getTestData<T>(baseData: T, overrides: Partial<T> = {}): T {
  return { ...baseData, ...overrides };
}

// Helper function to create test ObjectIds
export function createTestObjectId(): string {
  return new Array(24).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
