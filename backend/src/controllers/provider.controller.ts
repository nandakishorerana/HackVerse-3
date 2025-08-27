import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ServiceProvider from '@/models/ServiceProvider.model';
import User from '@/models/User.model';
import Service from '@/models/Service.model';
import Booking from '@/models/Booking.model';
import { AppError, catchAsync, successResponse } from '@/middleware/error.middleware';
import { IAuthenticatedRequest, IAvailability, IPortfolioItem } from '@/types';
import logger from '@/config/logger';
import emailService from '@/services/email.service';

/**
 * @desc    Get all service providers with filters
 * @route   GET /api/v1/providers
 * @access  Public
 */
export const getAllProviders = catchAsync(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    city,
    service,
    minRating,
    maxPrice,
    verified = 'all',
    sort = '-rating'
  } = req.query;

  const query: any = { isAvailable: true };

  // Filter by city
  if (city) {
    query['serviceArea.cities'] = { $regex: new RegExp(city as string, 'i') };
  }

  // Filter by service
  if (service) {
    query.services = service;
  }

  // Filter by rating
  if (minRating) {
    query.rating = { $gte: parseFloat(minRating as string) };
  }

  // Filter by hourly rate
  if (maxPrice) {
    query.hourlyRate = { $lte: parseFloat(maxPrice as string) };
  }

  // Filter by verification status
  if (verified !== 'all') {
    query.isVerified = verified === 'true';
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [providers, totalProviders] = await Promise.all([
    ServiceProvider.find(query)
      .populate('user', 'name avatar phone')
      .populate('services', 'name category basePrice')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceProvider.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalProviders / limitNum);

  successResponse(res, 'Service providers retrieved successfully', {
    providers,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalProviders,
      itemsPerPage: limitNum,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  });
});

/**
 * @desc    Get provider by ID
 * @route   GET /api/v1/providers/:id
 * @access  Public
 */
export const getProviderById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const provider = await ServiceProvider.findById(id)
    .populate('user', 'name avatar phone email address')
    .populate('services', 'name category basePrice duration description');

  if (!provider) {
    return next(new AppError('Service provider not found', 404));
  }

  if (!provider.isAvailable) {
    return next(new AppError('Service provider is not available', 404));
  }

  // Increment profile views
  provider.incrementProfileViews();

  successResponse(res, 'Service provider retrieved successfully', { provider });
});

/**
 * @desc    Get providers by service and location
 * @route   GET /api/v1/providers/search
 * @access  Public
 */
export const searchProviders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { serviceId, city, page = 1, limit = 20 } = req.query;

  if (!serviceId || !city) {
    return next(new AppError('Service ID and city are required', 400));
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

  const providers = await (ServiceProvider as any).findByServiceAndLocation(
    serviceId as string,
    city as string,
    pageNum,
    limitNum
  );

  const totalCount = await ServiceProvider.countDocuments({
    services: serviceId,
    'serviceArea.cities': { $regex: new RegExp(city as string, 'i') },
    isVerified: true,
    isAvailable: true
  });

  const totalPages = Math.ceil(totalCount / limitNum);

  successResponse(res, 'Providers found successfully', {
    providers,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limitNum,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  });
});

/**
 * @desc    Get top providers
 * @route   GET /api/v1/providers/top
 * @access  Public
 */
export const getTopProviders = catchAsync(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

  const providers = await (ServiceProvider as any).getTopProviders(limitNum);

  successResponse(res, 'Top providers retrieved successfully', { providers });
});

/**
 * @desc    Register as service provider
 * @route   POST /api/v1/providers
 * @access  Private
 */
export const registerProvider = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    services,
    experience,
    hourlyRate,
    description,
    skills,
    serviceArea,
    verificationDocuments
  } = req.body;

  const user = req.user!;

  // Check if user already has a provider profile
  const existingProvider = await ServiceProvider.findOne({ user: user._id });
  if (existingProvider) {
    return next(new AppError('You already have a service provider profile', 409));
  }

  // Validate services exist
  if (services && services.length > 0) {
    const validServices = await Service.find({ _id: { $in: services }, isActive: true });
    if (validServices.length !== services.length) {
      return next(new AppError('One or more selected services are invalid', 400));
    }
  }

  // Create provider profile
  const provider = await ServiceProvider.create({
    user: user._id,
    services: services || [],
    experience,
    hourlyRate,
    description,
    skills: skills || [],
    serviceArea: {
      cities: serviceArea?.cities || [],
      maxDistance: serviceArea?.maxDistance || 25
    },
    verificationDocuments: verificationDocuments || []
  });

  // Update user role to provider
  await User.findByIdAndUpdate(user._id, { role: 'provider' });

  // Send application confirmation email
  try {
    await emailService.sendProviderApplicationConfirmation(user);
  } catch (error) {
    logger.error('Failed to send provider application confirmation email:', error);
  }

  const populatedProvider = await ServiceProvider.findById(provider._id)
    .populate('user', 'name email phone avatar')
    .populate('services', 'name category');

  successResponse(res, 'Provider profile created successfully', { provider: populatedProvider }, 201);
});

/**
 * @desc    Update provider profile
 * @route   PUT /api/v1/providers/:id
 * @access  Private
 */
export const updateProviderProfile = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id);

  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Check if user owns this provider profile or is admin
  if (user.role !== 'admin' && provider.user.toString() !== user._id.toString()) {
    return next(new AppError('You can only update your own provider profile', 403));
  }

  // Update allowed fields
  const allowedUpdates = [
    'services', 'experience', 'hourlyRate', 'description', 'skills',
    'serviceArea', 'availability', 'isAvailable'
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      provider[field] = req.body[field];
    }
  });

  await provider.save();

  const updatedProvider = await ServiceProvider.findById(provider._id)
    .populate('user', 'name email phone avatar')
    .populate('services', 'name category');

  successResponse(res, 'Provider profile updated successfully', { provider: updatedProvider });
});

/**
 * @desc    Get provider reviews
 * @route   GET /api/v1/providers/:id/reviews
 * @access  Public
 */
export const getProviderReviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20, rating } = req.query;

  const provider = await ServiceProvider.findById(id);
  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Import Review model dynamically to avoid circular dependency
  const Review = (await import('@/models/Review.model')).default;

  const reviews = await (Review as any).getByProvider(
    id,
    parseInt(page as string),
    parseInt(limit as string),
    rating ? parseInt(rating as string) : undefined
  );

  const totalCount = await Review.countDocuments({
    provider: id,
    isReported: false,
    ...(rating && { rating: parseInt(rating as string) })
  });

  const totalPages = Math.ceil(totalCount / parseInt(limit as string));
  const currentPage = parseInt(page as string);

  // Get provider rating statistics
  const ratingStats = await (Review as any).getProviderStats(id);

  successResponse(res, 'Provider reviews retrieved successfully', {
    reviews,
    ratingStats,
    pagination: {
      currentPage,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: parseInt(limit as string),
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  });
});

/**
 * @desc    Add portfolio item
 * @route   POST /api/v1/providers/:id/portfolio
 * @access  Private
 */
export const addPortfolioItem = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, description, images, serviceType, completedDate, clientFeedback } = req.body;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id);

  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Check if user owns this provider profile or is admin
  if (user.role !== 'admin' && provider.user.toString() !== user._id.toString()) {
    return next(new AppError('You can only update your own provider profile', 403));
  }

  const portfolioItem: IPortfolioItem = {
    title,
    description,
    images: images || [],
    serviceType,
    completedDate: new Date(completedDate),
    clientFeedback
  };

  await provider.addPortfolioItem(portfolioItem);

  successResponse(res, 'Portfolio item added successfully', {
    portfolioItem: provider.portfolio[provider.portfolio.length - 1]
  });
});

/**
 * @desc    Update availability
 * @route   PUT /api/v1/providers/:id/availability
 * @access  Private
 */
export const updateAvailability = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { availability } = req.body;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id);

  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Check if user owns this provider profile or is admin
  if (user.role !== 'admin' && provider.user.toString() !== user._id.toString()) {
    return next(new AppError('You can only update your own provider profile', 403));
  }

  await provider.updateAvailability(availability as IAvailability);

  successResponse(res, 'Availability updated successfully', {
    availability: provider.availability
  });
});

/**
 * @desc    Toggle provider availability
 * @route   PATCH /api/v1/providers/:id/toggle-availability
 * @access  Private
 */
export const toggleAvailability = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id);

  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Check if user owns this provider profile or is admin
  if (user.role !== 'admin' && provider.user.toString() !== user._id.toString()) {
    return next(new AppError('You can only update your own provider profile', 403));
  }

  provider.isAvailable = !provider.isAvailable;
  await provider.save();

  successResponse(res, `Provider ${provider.isAvailable ? 'activated' : 'deactivated'} successfully`, {
    provider: {
      id: provider._id,
      isAvailable: provider.isAvailable
    }
  });
});

/**
 * @desc    Verify provider (Admin only)
 * @route   PUT /api/v1/providers/:id/verify
 * @access  Private/Admin
 */
export const verifyProvider = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { isVerified, remarks } = req.body;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id).populate('user', 'name email');

  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  provider.isVerified = isVerified;

  // Update verification documents if verifying
  if (isVerified && provider.verificationDocuments.length > 0) {
    provider.verificationDocuments.forEach(doc => {
      doc.isVerified = true;
      doc.verifiedBy = user._id;
      doc.verifiedAt = new Date();
      if (remarks) {
        doc.remarks = remarks;
      }
    });
  }

  await provider.save();

  successResponse(res, `Provider ${isVerified ? 'verified' : 'unverified'} successfully`, {
    provider: {
      id: provider._id,
      isVerified: provider.isVerified,
      verificationDocuments: provider.verificationDocuments
    }
  });
});

/**
 * @desc    Get provider statistics (Admin only)
 * @route   GET /api/v1/providers/stats
 * @access  Private/Admin
 */
export const getProviderStats = catchAsync(async (req: IAuthenticatedRequest, res: Response) => {
  const stats = await ServiceProvider.aggregate([
    {
      $group: {
        _id: null,
        totalProviders: { $sum: 1 },
        verifiedProviders: { $sum: { $cond: ['$isVerified', 1, 0] } },
        activeProviders: { $sum: { $cond: ['$isAvailable', 1, 0] } },
        averageRating: { $avg: '$rating' },
        averageExperience: { $avg: '$experience' },
        averageHourlyRate: { $avg: '$hourlyRate' }
      }
    }
  ]);

  const topProviders = await ServiceProvider.find({ isVerified: true, isAvailable: true })
    .populate('user', 'name avatar')
    .sort({ rating: -1, totalReviews: -1 })
    .limit(10)
    .select('user rating totalReviews completedBookings')
    .lean();

  const cityStats = await ServiceProvider.aggregate([
    { $unwind: '$serviceArea.cities' },
    {
      $group: {
        _id: '$serviceArea.cities',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  successResponse(res, 'Provider statistics retrieved successfully', {
    overview: stats[0] || {
      totalProviders: 0,
      verifiedProviders: 0,
      activeProviders: 0,
      averageRating: 0,
      averageExperience: 0,
      averageHourlyRate: 0
    },
    topProviders,
    cityStats
  });
});

/**
 * @desc    Get my provider profile
 * @route   GET /api/v1/providers/me
 * @access  Private/Provider
 */
export const getMyProviderProfile = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user!;

  const provider = await ServiceProvider.findOne({ user: user._id })
    .populate('user', 'name email phone avatar address')
    .populate('services', 'name category basePrice duration');

  if (!provider) {
    return next(new AppError('Provider profile not found', 404));
  }

  successResponse(res, 'Provider profile retrieved successfully', { provider });
});

/**
 * @desc    Get provider bookings
 * @route   GET /api/v1/providers/:id/bookings
 * @access  Private
 */
export const getProviderBookings = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status } = req.query;
  const user = req.user!;

  // Check if user can access this provider's bookings
  if (user.role !== 'admin' && user._id.toString() !== id) {
    return next(new AppError('You can only access your own bookings', 403));
  }

  const query: any = { provider: id };
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [bookings, totalCount] = await Promise.all([
    Booking.find(query)
      .populate('customer', 'name phone avatar')
      .populate('service', 'name category duration')
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Booking.countDocuments(query)
  ]);

  successResponse(res, 'Provider bookings retrieved successfully', {
    bookings,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalItems: totalCount,
      itemsPerPage: limitNum
    }
  });
});

/**
 * @desc    Update provider settings
 * @route   PUT /api/v1/providers/:id/settings
 * @access  Private
 */
export const updateProviderSettings = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user!;

  const provider = await ServiceProvider.findById(id);
  if (!provider) {
    return next(new AppError('Provider not found', 404));
  }

  // Check if user owns this provider profile or is admin
  if (user.role !== 'admin' && provider.user.toString() !== user._id.toString()) {
    return next(new AppError('You can only update your own provider settings', 403));
  }

  const allowedUpdates = ['hourlyRate', 'availability', 'serviceArea', 'isAvailable'];
  const updateData: any = {};

  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const updatedProvider = await ServiceProvider.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  successResponse(res, 'Provider settings updated successfully', { provider: updatedProvider });
});

/**
 * @desc    Get provider earnings
 * @route   GET /api/v1/providers/:id/earnings
 * @access  Private
 */
export const getProviderEarnings = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user!;

  // Check if user can access this provider's earnings
  if (user.role !== 'admin' && user._id.toString() !== id) {
    return next(new AppError('You can only access your own earnings', 403));
  }

  const earnings = await Booking.aggregate([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(id),
        status: 'completed',
        'payment.status': 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$pricing.totalAmount' },
        totalBookings: { $sum: 1 },
        averageBookingValue: { $avg: '$pricing.totalAmount' }
      }
    }
  ]);

  const monthlyEarnings = await Booking.aggregate([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(id),
        status: 'completed',
        'payment.status': 'paid'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        earnings: { $sum: '$pricing.totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);

  successResponse(res, 'Provider earnings retrieved successfully', {
    overview: earnings[0] || {
      totalEarnings: 0,
      totalBookings: 0,
      averageBookingValue: 0
    },
    monthlyEarnings
  });
});

export default {
  getAllProviders,
  getProviderById,
  searchProviders,
  getTopProviders,
  registerProvider,
  updateProviderProfile,
  getProviderReviews,
  addPortfolioItem,
  updateAvailability,
  toggleAvailability,
  verifyProvider,
  getProviderStats,
  getMyProviderProfile,
  getProviderBookings,
  updateProviderSettings,
  getProviderEarnings
};
