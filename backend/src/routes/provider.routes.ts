import express from 'express';
import {
  registerProvider,
  getAllProviders,
  getProviderById,
  updateProviderProfile,
  updateAvailability,
  getProviderStats,
  verifyProvider,
  getProviderBookings,
  getProviderReviews,
  updateProviderSettings,
  getProviderEarnings
} from '@/controllers/provider.controller';
import { protect, restrictTo, optionalAuth } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().isString(),
  query('city').optional().isString(),
  query('verified').optional().isBoolean(),
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  validateRequest
], optionalAuth, getAllProviders);

router.get('/:id', [
  param('id').isMongoId().withMessage('Valid provider ID is required'),
  validateRequest
], optionalAuth, getProviderById);

router.get('/:id/reviews', [
  param('id').isMongoId().withMessage('Valid provider ID is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest
], getProviderReviews);

// Provider registration
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number is required'),
  body('services').isArray().withMessage('Services array is required'),
  body('address').isObject().withMessage('Address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required'),
  validateRequest
], registerProvider);

// Protected routes - require authentication
router.use(protect);

// Provider profile management
router.put('/profile', [
  body('name').optional().isString(),
  body('bio').optional().isString(),
  body('experience').optional().isInt({ min: 0 }),
  body('services').optional().isArray(),
  body('address').optional().isObject(),
  validateRequest
], updateProviderProfile);

router.put('/availability', [
  body('weeklySchedule').isObject().withMessage('Weekly schedule is required'),
  body('isActive').optional().isBoolean(),
  validateRequest
], updateAvailability);

router.put('/settings', [
  body('autoAcceptBookings').optional().isBoolean(),
  body('serviceRadius').optional().isInt({ min: 1, max: 100 }),
  body('notifications').optional().isObject(),
  validateRequest
], updateProviderSettings);

// Provider dashboard routes
router.get('/dashboard/stats', getProviderStats);
router.get('/dashboard/bookings', getProviderBookings);
router.get('/dashboard/earnings', getProviderEarnings);

// Admin routes
router.put('/verify/:id', [
  param('id').isMongoId().withMessage('Valid provider ID is required'),
  body('verified').isBoolean().withMessage('Verification status is required'),
  body('verificationNotes').optional().isString(),
  validateRequest
], restrictTo('admin'), verifyProvider);

export default router;
