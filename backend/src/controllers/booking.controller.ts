import { Response, NextFunction } from 'express';
import Booking from '@/models/Booking.model';
import ServiceProvider from '@/models/ServiceProvider.model';
import Service from '@/models/Service.model';
import User from '@/models/User.model';
import { AppError, catchAsync, successResponse } from '@/middleware/error.middleware';
import { IAuthenticatedRequest } from '@/types';
import logger from '@/config/logger';
import emailService from '@/services/email.service';

/**
 * @desc    Create new booking
 * @route   POST /api/v1/bookings
 * @access  Private
 */
export const createBooking = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    providerId,
    serviceId,
    scheduledDate,
    address,
    contactPhone,
    specialInstructions
  } = req.body;

  const user = req.user!;

  // Validate provider exists and is available
  const provider = await ServiceProvider.findById(providerId).populate('user');
  if (!provider || !provider.isAvailable) {
    return next(new AppError('Service provider not found or unavailable', 404));
  }

  // Validate service exists and is active
  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return next(new AppError('Service not found or unavailable', 404));
  }

  // Check if provider offers this service
  if (!provider.services.includes(serviceId)) {
    return next(new AppError('This provider does not offer the selected service', 400));
  }

  // Calculate pricing
  const baseAmount = service.basePrice;
  const taxAmount = Math.round(baseAmount * 0.18); // 18% GST
  const totalAmount = baseAmount + taxAmount;

  // Create booking
  const booking = await Booking.create({
    customer: user._id,
    provider: providerId,
    service: serviceId,
    scheduledDate: new Date(scheduledDate),
    estimatedDuration: service.duration,
    address,
    contactPhone: contactPhone || user.phone,
    specialInstructions,
    pricing: {
      baseAmount,
      additionalCharges: [],
      taxAmount,
      totalAmount
    },
    payment: {
      status: 'pending',
      paidAmount: 0
    }
  });

  // Populate booking details for response
  const populatedBooking = await Booking.findById(booking._id)
    .populate('service', 'name category basePrice duration')
    .populate({
      path: 'provider',
      select: 'user hourlyRate',
      populate: { path: 'user', select: 'name phone avatar' }
    });

  // Send confirmation emails
  try {
    await emailService.sendBookingConfirmation(user, populatedBooking);
    if (provider.user && typeof provider.user === 'object' && 'email' in provider.user) {
      // Notify provider about new booking
      await emailService.sendBookingConfirmation(provider.user as any, populatedBooking);
    }
  } catch (error) {
    logger.error('Failed to send booking confirmation emails:', error);
  }

  successResponse(res, 'Booking created successfully', { booking: populatedBooking }, 201);
});

/**
 * @desc    Get user bookings (customer or provider)
 * @route   GET /api/v1/bookings
 * @access  Private
 */
export const getUserBookings = catchAsync(async (req: IAuthenticatedRequest, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const user = req.user!;

  let bookings;
  let totalCount;

  if (user.role === 'provider') {
    // Find provider profile
    const provider = await ServiceProvider.findOne({ user: user._id });
    if (!provider) {
      return successResponse(res, 'No bookings found', { bookings: [], pagination: null });
    }

    bookings = await (Booking as any).findByProvider(
      provider._id,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    totalCount = await Booking.countDocuments({
      provider: provider._id,
      ...(status && { status })
    });
  } else {
    // Customer bookings
    bookings = await (Booking as any).findByCustomer(
      user._id,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    totalCount = await Booking.countDocuments({
      customer: user._id,
      ...(status && { status })
    });
  }

  const totalPages = Math.ceil(totalCount / parseInt(limit as string));
  const currentPage = parseInt(page as string);

  successResponse(res, 'Bookings retrieved successfully', {
    bookings,
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
 * @desc    Get booking by ID
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
export const getBookingById = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user!;

  const booking = await Booking.findById(id)
    .populate('customer', 'name phone email avatar')
    .populate('service', 'name category basePrice duration')
    .populate({
      path: 'provider',
      select: 'user hourlyRate rating totalReviews',
      populate: { path: 'user', select: 'name phone avatar' }
    });

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user can access this booking
  const canAccess = user.role === 'admin' || 
                   booking.customer._id.toString() === user._id.toString() ||
                   (user.role === 'provider' && booking.provider && 
                    typeof booking.provider === 'object' && 
                    'user' in booking.provider && 
                    booking.provider.user.toString() === user._id.toString());

  if (!canAccess) {
    return next(new AppError('You can only access your own bookings', 403));
  }

  successResponse(res, 'Booking retrieved successfully', { booking });
});

/**
 * @desc    Update booking status
 * @route   PUT /api/v1/bookings/:id/status
 * @access  Private
 */
export const updateBookingStatus = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, reason, comments } = req.body;
  const user = req.user!;

  const booking = await Booking.findById(id)
    .populate('customer', 'name email')
    .populate('service', 'name');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Validate status transitions
  const validTransitions: { [key: string]: string[] } = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': [],
    'no-show': []
  };

  if (!validTransitions[booking.status].includes(status)) {
    return next(new AppError(`Cannot change status from ${booking.status} to ${status}`, 400));
  }

  // Check permissions
  let canUpdate = false;
  if (user.role === 'admin') {
    canUpdate = true;
  } else if (user.role === 'provider') {
    const provider = await ServiceProvider.findOne({ user: user._id });
    canUpdate = provider && booking.provider.toString() === provider._id.toString();
  } else if (user.role === 'customer' && ['cancelled'].includes(status)) {
    canUpdate = booking.customer._id.toString() === user._id.toString();
  }

  if (!canUpdate) {
    return next(new AppError('You do not have permission to update this booking status', 403));
  }

  // Update booking status
  await booking.updateStatus(status, user._id.toString(), reason, comments);

  // Send status update email
  try {
    if (booking.customer && typeof booking.customer === 'object' && 'email' in booking.customer) {
      await emailService.sendBookingStatusUpdate(booking.customer as any, booking, status);
    }
  } catch (error) {
    logger.error('Failed to send booking status update email:', error);
  }

  // Update provider booking count
  if (status === 'completed') {
    await ServiceProvider.findByIdAndUpdate(booking.provider, {
      $inc: { completedBookings: 1 }
    });
  }

  successResponse(res, 'Booking status updated successfully', {
    booking: {
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      updatedAt: booking.updatedAt
    }
  });
});

/**
 * @desc    Cancel booking
 * @route   DELETE /api/v1/bookings/:id
 * @access  Private
 */
export const cancelBooking = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  const booking = await Booking.findById(id).populate('customer', 'name email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.status === 'cancelled') {
    return next(new AppError('Booking is already cancelled', 400));
  }

  if (['completed', 'in-progress'].includes(booking.status)) {
    return next(new AppError(`Cannot cancel booking in ${booking.status} status`, 400));
  }

  // Check permissions
  const canCancel = user.role === 'admin' || 
                   booking.customer._id.toString() === user._id.toString() ||
                   (user.role === 'provider');

  if (!canCancel) {
    return next(new AppError('You do not have permission to cancel this booking', 403));
  }

  // Calculate refund amount
  const refundAmount = booking.calculateRefundAmount();

  // Update booking
  await booking.updateStatus('cancelled', user._id.toString(), reason);
  booking.refundAmount = refundAmount;
  booking.cancelledBy = user.role as any;
  await booking.save();

  successResponse(res, 'Booking cancelled successfully', {
    booking: {
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      refundAmount,
      cancelledBy: user.role
    }
  });
});

/**
 * @desc    Add work summary to booking
 * @route   PUT /api/v1/bookings/:id/work-summary
 * @access  Private/Provider
 */
export const addWorkSummary = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    workDescription,
    beforeImages,
    afterImages,
    materialsUsed,
    additionalNotes
  } = req.body;
  const user = req.user!;

  const booking = await Booking.findById(id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Only provider can add work summary
  if (user.role !== 'provider' && user.role !== 'admin') {
    return next(new AppError('Only service providers can add work summary', 403));
  }

  if (user.role === 'provider') {
    const provider = await ServiceProvider.findOne({ user: user._id });
    if (!provider || booking.provider.toString() !== provider._id.toString()) {
      return next(new AppError('You can only add work summary to your own bookings', 403));
    }
  }

  if (!['in-progress', 'completed'].includes(booking.status)) {
    return next(new AppError('Can only add work summary to in-progress or completed bookings', 400));
  }

  const workSummary = {
    workDescription,
    beforeImages: beforeImages || [],
    afterImages: afterImages || [],
    materialsUsed: materialsUsed || [],
    additionalNotes
  };

  await booking.addWorkSummary(workSummary);

  successResponse(res, 'Work summary added successfully', {
    workSummary: booking.workSummary
  });
});

/**
 * @desc    Get today's bookings (for providers)
 * @route   GET /api/v1/bookings/today
 * @access  Private/Provider
 */
export const getTodaysBookings = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user!;

  let providerId;
  if (user.role === 'provider') {
    const provider = await ServiceProvider.findOne({ user: user._id });
    if (!provider) {
      return next(new AppError('Provider profile not found', 404));
    }
    providerId = provider._id;
  }

  const bookings = await (Booking as any).getTodaysBookings(providerId);

  successResponse(res, "Today's bookings retrieved successfully", { bookings });
});

/**
 * @desc    Get upcoming bookings
 * @route   GET /api/v1/bookings/upcoming
 * @access  Private
 */
export const getUpcomingBookings = catchAsync(async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const { limit = 10 } = req.query;
  const user = req.user!;

  let userId = user._id.toString();
  let userType: 'customer' | 'provider' = 'customer';

  if (user.role === 'provider') {
    const provider = await ServiceProvider.findOne({ user: user._id });
    if (!provider) {
      return next(new AppError('Provider profile not found', 404));
    }
    userId = provider._id.toString();
    userType = 'provider';
  }

  const bookings = await (Booking as any).getUpcomingBookings(userId, userType, parseInt(limit as string));

  successResponse(res, 'Upcoming bookings retrieved successfully', { bookings });
});

/**
 * @desc    Get booking statistics (Admin only)
 * @route   GET /api/v1/bookings/stats
 * @access  Private/Admin
 */
export const getBookingStats = catchAsync(async (req: IAuthenticatedRequest, res: Response) => {
  const stats = await Booking.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmedBookings: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        inProgressBookings: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        averageBookingValue: { $avg: '$pricing.totalAmount' }
      }
    }
  ]);

  const monthlyStats = await Booking.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        bookings: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    { $limit: 12 }
  ]);

  const serviceStats = await Booking.aggregate([
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'serviceInfo'
      }
    },
    {
      $unwind: '$serviceInfo'
    },
    {
      $group: {
        _id: '$serviceInfo.category',
        bookings: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  successResponse(res, 'Booking statistics retrieved successfully', {
    overview: stats[0] || {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      inProgressBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalRevenue: 0,
      averageBookingValue: 0
    },
    monthlyStats,
    serviceStats
  });
});

export default {
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addWorkSummary,
  getTodaysBookings,
  getUpcomingBookings,
  getBookingStats
};
