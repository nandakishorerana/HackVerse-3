import { Request, Response } from 'express';
import { User, Service, ServiceProvider, Booking, Review } from '@/models';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/utils/catchAsync';
import { APIFeatures } from '@/utils/APIFeatures';
import { emailService } from '@/services/email.service';

// Get dashboard overview statistics
export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const [
    userStats,
    serviceStats,
    providerStats,
    bookingStats,
    reviewStats,
    revenueStats
  ] = await Promise.all([
    // User Statistics
    User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          verifiedUsers: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          customers: { $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] } },
          providers: { $sum: { $cond: [{ $eq: ['$role', 'provider'] }, 1, 0] } }
        }
      }
    ]),

    // Service Statistics
    Service.aggregate([
      {
        $group: {
          _id: null,
          totalServices: { $sum: 1 },
          activeServices: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          avgPrice: { $avg: '$price' }
        }
      }
    ]),

    // Provider Statistics
    ServiceProvider.aggregate([
      {
        $group: {
          _id: null,
          totalProviders: { $sum: 1 },
          activeProviders: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          verifiedProviders: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } }
        }
      }
    ]),

    // Booking Statistics
    Booking.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmedBookings: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]),

    // Review Statistics
    Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          reportedReviews: { $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] } }
        }
      }
    ]),

    // Revenue Statistics (from completed bookings)
    Booking.aggregate([
      {
        $match: { status: 'completed', 'payment.status': 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          platformFee: { $sum: '$platformFee' },
          averageBookingValue: { $avg: '$totalAmount' }
        }
      }
    ])
  ]);

  // Calculate growth rates (comparing to last month)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const [lastMonthUsers, lastMonthBookings] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: lastMonth } }),
    Booking.countDocuments({ createdAt: { $gte: lastMonth } })
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: userStats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        customers: 0,
        providers: 0
      },
      services: serviceStats[0] || {
        totalServices: 0,
        activeServices: 0,
        avgPrice: 0
      },
      providers: providerStats[0] || {
        totalProviders: 0,
        activeProviders: 0,
        verifiedProviders: 0
      },
      bookings: bookingStats[0] || {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0
      },
      reviews: reviewStats[0] || {
        totalReviews: 0,
        averageRating: 0,
        reportedReviews: 0
      },
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        platformFee: 0,
        averageBookingValue: 0
      },
      growth: {
        newUsers: lastMonthUsers,
        newBookings: lastMonthBookings
      }
    }
  });
});

// Get analytics data for charts
export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { period = '6months' } = req.query;

  let startDate: Date;
  let groupBy: any;

  switch (period) {
    case '7days':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      break;
    case '30days':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      break;
    case '3months':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
      break;
    case '6months':
    default:
      startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      break;
    case '1year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      break;
  }

  const [userGrowth, bookingTrends, revenueTrends] = await Promise.all([
    // User growth over time
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Booking trends
    Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            period: groupBy,
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.period': 1 } }
    ]),

    // Revenue trends
    Booking.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: 'completed',
          'payment.status': 'completed'
        } 
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalAmount' },
          platformFee: { $sum: '$platformFee' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      userGrowth,
      bookingTrends,
      revenueTrends,
      period
    }
  });
});

// Get system health and performance metrics
export const getSystemHealth = catchAsync(async (req: Request, res: Response) => {
  // Database connection status
  const dbStatus = 'connected'; // You would check actual DB connection here

  // Recent errors (you would typically store these in a separate collection)
  const recentErrors: any[] = []; // Placeholder

  // API performance metrics (you would typically use a monitoring service)
  const apiMetrics = {
    averageResponseTime: 150, // ms
    requestsPerMinute: 45,
    errorRate: 0.02 // 2%
  };

  // Queue status (if using job queues)
  const queueStatus = {
    emailQueue: 0,
    notificationQueue: 0,
    processingQueue: 0
  };

  res.status(200).json({
    success: true,
    data: {
      database: {
        status: dbStatus,
        connections: 5, // active connections
        responseTime: 25 // ms
      },
      api: apiMetrics,
      queues: queueStatus,
      recentErrors,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    }
  });
});

// Get recent activities/audit log
export const getRecentActivities = catchAsync(async (req: Request, res: Response) => {
  // This would typically come from an audit log collection
  // For now, we'll get recent entities from different collections
  const [recentUsers, recentBookings, recentProviders, recentReviews] = await Promise.all([
    User.find().sort('-createdAt').limit(5).select('name email role createdAt'),
    Booking.find().sort('-createdAt').limit(5).populate('customer', 'name').populate('service', 'name'),
    ServiceProvider.find().sort('-createdAt').limit(3).select('name email createdAt'),
    Review.find().sort('-createdAt').limit(5).populate('customer', 'name').populate('service', 'name')
  ]);

  const activities = [
    ...recentUsers.map(user => ({
      type: 'user_registered',
      description: `New user ${user.name} registered`,
      timestamp: user.createdAt,
      metadata: { userId: user._id, role: user.role }
    })),
    ...recentBookings.map(booking => ({
      type: 'booking_created',
      description: `New booking created by ${typeof booking.customer === 'object' && booking.customer ? booking.customer.name : 'customer'}`,
      timestamp: booking.createdAt,
      metadata: { bookingId: booking._id }
    })),
    ...recentProviders.map(provider => ({
      type: 'provider_registered',
      description: `New service provider ${typeof provider.user === 'object' && provider.user ? provider.user.name : 'provider'} registered`,
      timestamp: provider.createdAt,
      metadata: { providerId: provider._id }
    })),
    ...recentReviews.map(review => ({
      type: 'review_created',
      description: `New review posted for ${typeof review.service === 'object' && review.service ? review.service.name : 'service'}`,
      timestamp: review.createdAt,
      metadata: { reviewId: review._id }
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);

  res.status(200).json({
    success: true,
    data: activities
  });
});

// Send system announcement
export const sendAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { title, message, userType, priority = 'normal' } = req.body;

  let userFilter: any = { isActive: true };
  
  if (userType && userType !== 'all') {
    userFilter.role = userType;
  }

  const users = await User.find(userFilter).select('email name');

  // Send emails to all matching users
  const emailPromises = users.map(user => 
    emailService.sendSystemAnnouncementEmail(user.email, user.name, title, message)
  );

  await Promise.all(emailPromises);

  // Log the announcement (in a real app, you'd save this to an announcements collection)
  console.log(`Announcement sent to ${users.length} users:`, { title, message, userType });

  res.status(200).json({
    success: true,
    message: `Announcement sent to ${users.length} users successfully`,
    data: {
      recipientCount: users.length,
      title,
      userType
    }
  });
});

// Get platform statistics for reports
export const getPlatformReport = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const [
    periodStats,
    topServices,
    topProviders,
    locationStats
  ] = await Promise.all([
    // Overall period statistics
    Promise.all([
      User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Booking.aggregate([
        { 
          $match: { 
            createdAt: { $gte: start, $lte: end },
            status: 'completed',
            'payment.status': 'completed'
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            platformFee: { $sum: '$platformFee' }
          }
        }
      ])
    ]),

    // Top performing services
    Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$service',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      }
    ]),

    // Top performing providers
    Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$provider',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'serviceproviders',
          localField: '_id',
          foreignField: '_id',
          as: 'providerInfo'
        }
      }
    ]),

    // Location-based statistics
    Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$address.city',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { start, end },
      overview: {
        newUsers: periodStats[0],
        totalBookings: periodStats[1],
        revenue: periodStats[2][0] || { totalRevenue: 0, platformFee: 0 }
      },
      topServices,
      topProviders,
      locationStats
    }
  });
});

// Manage platform settings
export const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const settings = req.body;

  // In a real app, you'd store these in a settings collection or configuration service
  // For now, we'll just validate and return success
  const validSettings = [
    'platformFeePercentage',
    'maxBookingDays',
    'reviewEditWindow',
    'maintenanceMode',
    'allowNewRegistrations'
  ];

  const validatedSettings: any = {};
  for (const [key, value] of Object.entries(settings)) {
    if (validSettings.includes(key)) {
      validatedSettings[key] = value;
    }
  }

  // Here you would typically save to a settings collection
  console.log('Updated platform settings:', validatedSettings);

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: validatedSettings
  });
});

// Export data for compliance/backup
export const exportData = catchAsync(async (req: Request, res: Response) => {
  const { dataType, format = 'json' } = req.query;

  let data: any;
  let filename: string;

  switch (dataType) {
    case 'users':
      data = await User.find().select('-password');
      filename = `users_export_${Date.now()}`;
      break;
    case 'bookings':
      data = await Booking.find().populate('customer service provider');
      filename = `bookings_export_${Date.now()}`;
      break;
    case 'reviews':
      data = await Review.find().populate('customer service provider');
      filename = `reviews_export_${Date.now()}`;
      break;
    default:
      throw new AppError('Invalid data type for export', 400);
  }

  if (format === 'csv') {
    // You would typically use a CSV library here
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.status(200).send('CSV export not implemented yet');
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.status(200).json({
      exportedAt: new Date(),
      dataType,
      count: data.length,
      data
    });
  }
});

// Get pending approvals (providers, services, etc.)
export const getPendingApprovals = catchAsync(async (req: Request, res: Response) => {
  const [pendingProviders, reportedReviews, flaggedContent] = await Promise.all([
    ServiceProvider.find({ isVerified: false, isActive: true })
      .select('name email phone services createdAt')
      .limit(20),
    
    Review.find({ status: 'reported' })
      .populate('customer', 'name')
      .populate('service', 'name')
      .limit(20),

    // Add other types of content that need approval
    []
  ]);

  res.status(200).json({
    success: true,
    data: {
      pendingProviders: pendingProviders.length,
      reportedReviews: reportedReviews.length,
      flaggedContent: flaggedContent.length,
      details: {
        providers: pendingProviders,
        reviews: reportedReviews,
        content: flaggedContent
      }
    }
  });
});
