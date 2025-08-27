import { Request, Response } from 'express';
import { Review, Booking, User, Service, ServiceProvider } from '@/models';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/utils/catchAsync';
import { APIFeatures } from '@/utils/APIFeatures';

interface AuthRequest extends Request {
  user?: any;
}

// Create a new review
export const createReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { bookingId, serviceId, providerId, rating, comment, images } = req.body;
  const customerId = req.user.id;

  // Check if booking exists and belongs to the user
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.customer.toString() !== customerId) {
    throw new AppError('You can only review your own bookings', 403);
  }

  if (booking.status !== 'completed') {
    throw new AppError('You can only review completed bookings', 400);
  }

  // Check if review already exists
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    throw new AppError('You have already reviewed this booking', 400);
  }

  const review = await Review.create({
    customer: customerId,
    service: serviceId,
    provider: providerId,
    booking: bookingId,
    rating,
    comment,
    images: images || []
  });

  await review.populate('customer', 'name avatar');

  // Update service and provider ratings
  await updateServiceRating(serviceId);
  await updateProviderRating(providerId);

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: review
  });
});

// Get reviews for a service
export const getServiceReviews = catchAsync(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  
  const features = new APIFeatures(
    Review.find({ service: serviceId })
      .populate('customer', 'name avatar')
      .populate('booking', 'scheduledDate')
      .sort('-createdAt'),
    req.query
  ).paginate();

  const reviews = await features.query;
  const total = await Review.countDocuments({ service: serviceId });

  // Get rating distribution
  const ratingStats = await Review.aggregate([
    { $match: { service: serviceId } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  const avgRating = await Review.aggregate([
    { $match: { service: serviceId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    results: reviews.length,
    total,
    data: {
      reviews,
      stats: {
        averageRating: avgRating[0]?.averageRating || 0,
        totalReviews: avgRating[0]?.totalReviews || 0,
        ratingDistribution: ratingStats
      }
    }
  });
});

// Get reviews for a provider
export const getProviderReviews = catchAsync(async (req: Request, res: Response) => {
  const { providerId } = req.params;
  
  const features = new APIFeatures(
    Review.find({ provider: providerId })
      .populate('customer', 'name avatar')
      .populate('service', 'name')
      .populate('booking', 'scheduledDate')
      .sort('-createdAt'),
    req.query
  ).paginate();

  const reviews = await features.query;
  const total = await Review.countDocuments({ provider: providerId });

  // Get rating distribution
  const ratingStats = await Review.aggregate([
    { $match: { provider: providerId } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  const avgRating = await Review.aggregate([
    { $match: { provider: providerId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    results: reviews.length,
    total,
    data: {
      reviews,
      stats: {
        averageRating: avgRating[0]?.averageRating || 0,
        totalReviews: avgRating[0]?.totalReviews || 0,
        ratingDistribution: ratingStats
      }
    }
  });
});

// Get user's reviews (reviews written by the user)
export const getUserReviews = catchAsync(async (req: AuthRequest, res: Response) => {
  const customerId = req.user.id;
  
  const features = new APIFeatures(
    Review.find({ customer: customerId })
      .populate('service', 'name images')
      .populate('provider', 'name avatar')
      .populate('booking', 'scheduledDate')
      .sort('-createdAt'),
    req.query
  ).paginate();

  const reviews = await features.query;
  const total = await Review.countDocuments({ customer: customerId });

  res.status(200).json({
    success: true,
    results: reviews.length,
    total,
    data: reviews
  });
});

// Update a review
export const updateReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { rating, comment, images } = req.body;
  const customerId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.customer.toString() !== customerId) {
    throw new AppError('You can only update your own reviews', 403);
  }

  // Check if it's within edit window (e.g., 7 days)
  const daysSinceReview = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceReview > 7) {
    throw new AppError('Reviews can only be edited within 7 days', 400);
  }

  const updatedReview = await Review.findByIdAndUpdate(
    reviewId,
    { rating, comment, images, updatedAt: new Date() },
    { new: true, runValidators: true }
  ).populate('customer', 'name avatar');

  // Update service and provider ratings if rating changed
  if (review.rating !== rating) {
    await updateServiceRating(review.service.toString());
    await updateProviderRating(review.provider.toString());
  }

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: updatedReview
  });
});

// Delete a review
export const deleteReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const customerId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.customer.toString() !== customerId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  await Review.findByIdAndDelete(reviewId);

  // Update service and provider ratings
  await updateServiceRating(review.service.toString());
  await updateProviderRating(review.provider.toString());

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

// Report a review
export const reportReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { reason, description } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Add report to review
  review.reports.push({
    reportedBy: req.user.id,
    reason,
    description,
    reportedAt: new Date()
  });

  // If multiple reports, flag for admin review
  if (review.reports.length >= 3) {
    review.status = 'reported';
  }

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Review reported successfully'
  });
});

// Respond to a review (for providers)
export const respondToReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { response } = req.body;
  const providerId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.provider.toString() !== providerId) {
    throw new AppError('You can only respond to reviews for your services', 403);
  }

  if (review.providerResponse) {
    throw new AppError('You have already responded to this review', 400);
  }

  review.providerResponse = {
    response,
    respondedAt: new Date()
  };

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Response added successfully',
    data: review
  });
});

// Admin: Get all reviews with reports
export const getReportedReviews = catchAsync(async (req: Request, res: Response) => {
  const features = new APIFeatures(
    Review.find({ 
      $or: [
        { status: 'reported' },
        { 'reports.0': { $exists: true } }
      ]
    })
      .populate('customer', 'name email')
      .populate('provider', 'name email')
      .populate('service', 'name')
      .sort('-updatedAt'),
    req.query
  ).paginate();

  const reviews = await features.query;
  const total = await Review.countDocuments({ 
    $or: [
      { status: 'reported' },
      { 'reports.0': { $exists: true } }
    ]
  });

  res.status(200).json({
    success: true,
    results: reviews.length,
    total,
    data: reviews
  });
});

// Admin: Take action on reported review
export const moderateReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { action, reason } = req.body; // action: 'approve', 'hide', 'delete'

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  switch (action) {
    case 'approve':
      review.status = 'active';
      review.reports = [];
      break;
    case 'hide':
      review.status = 'hidden';
      break;
    case 'delete':
      await Review.findByIdAndDelete(reviewId);
      // Update ratings after deletion
      await updateServiceRating(review.service.toString());
      await updateProviderRating(review.provider.toString());
      
      return res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    default:
      throw new AppError('Invalid action', 400);
  }

  review.moderationReason = reason;
  await review.save();

  res.status(200).json({
    success: true,
    message: `Review ${action}ed successfully`,
    data: review
  });
});

// Helper function to update service rating
async function updateServiceRating(serviceId: string) {
  const stats = await Review.aggregate([
    { $match: { service: serviceId, status: 'active' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const rating = stats[0]?.averageRating || 0;
  const reviewCount = stats[0]?.totalReviews || 0;

  await Service.findByIdAndUpdate(serviceId, {
    'rating.average': rating,
    'rating.count': reviewCount
  });
}

// Helper function to update provider rating
async function updateProviderRating(providerId: string) {
  const stats = await Review.aggregate([
    { $match: { provider: providerId, status: 'active' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const rating = stats[0]?.averageRating || 0;
  const reviewCount = stats[0]?.totalReviews || 0;

  await ServiceProvider.findByIdAndUpdate(providerId, {
    'rating.average': rating,
    'rating.count': reviewCount
  });
}

// Get review statistics
export const getReviewStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        activeReviews: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        reportedReviews: { $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] } },
        hiddenReviews: { $sum: { $cond: [{ $eq: ['$status', 'hidden'] }, 1, 0] } }
      }
    }
  ]);

  const ratingDistribution = await Review.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  const monthlyReviews = await Review.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        activeReviews: 0,
        reportedReviews: 0,
        hiddenReviews: 0
      },
      ratingDistribution,
      monthlyReviews
    }
  });
});
