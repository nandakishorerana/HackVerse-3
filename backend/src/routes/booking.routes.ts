import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  addWorkSummary,
  getTodaysBookings,
  getUpcomingBookings,
  getBookingStats
} from '@/controllers/booking.controller';
import { protect, restrictTo } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's bookings
router.get('/', getUserBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/today', getTodaysBookings);

// Create new booking
router.post('/', [
  body('providerId').isMongoId().withMessage('Valid provider ID is required'),
  body('serviceId').isMongoId().withMessage('Valid service ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('address').isObject().withMessage('Address is required'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required'),
  validateRequest
], createBooking);

// Get booking by ID
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid booking ID is required'),
  validateRequest
], getBookingById);

// Update booking status
router.put('/:id/status', [
  param('id').isMongoId().withMessage('Valid booking ID is required'),
  body('status').isIn(['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid status'),
  validateRequest
], updateBookingStatus);

// Cancel booking
router.delete('/:id', [
  param('id').isMongoId().withMessage('Valid booking ID is required'),
  validateRequest
], cancelBooking);

// Add work summary (providers only)
router.put('/:id/work-summary', [
  param('id').isMongoId().withMessage('Valid booking ID is required'),
  body('workDescription').optional().isString(),
  validateRequest
], addWorkSummary);

// Admin routes
router.get('/admin/stats', restrictTo('admin'), getBookingStats);

export default router;
