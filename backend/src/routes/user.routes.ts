import express from 'express';
import {
  getMe,
  updateMe,
  updatePreferences,
  addAddress,
  updateAddress,
  deleteAddress,
  deactivateAccount,
  reactivateAccount,
  getUserStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStatistics,
  toggleUserStatus
} from '@/controllers/user.controller';
import { protect, restrictTo } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Protected routes - require authentication
router.use(protect);

// User profile routes
router.get('/me', getMe);
router.put('/me', [
  body('name').optional().isString().trim(),
  body('phone').optional().matches(/^[6-9]\d{9}$/),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  validateRequest
], updateMe);

// User preferences
router.put('/preferences', [
  body('language').optional().isString(),
  body('currency').optional().isString(),
  body('notifications').optional().isObject(),
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  validateRequest
], updatePreferences);

// Address management
router.post('/addresses', [
  body('type').isIn(['home', 'work', 'other']).withMessage('Valid address type is required'),
  body('street').notEmpty().withMessage('Street address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required'),
  validateRequest
], addAddress);

router.put('/addresses/:addressId', [
  param('addressId').isMongoId().withMessage('Valid address ID is required'),
  body('type').optional().isIn(['home', 'work', 'other']),
  body('street').optional().notEmpty(),
  body('city').optional().notEmpty(),
  body('state').optional().notEmpty(),
  body('pincode').optional().matches(/^\d{6}$/),
  validateRequest
], updateAddress);

router.delete('/addresses/:addressId', [
  param('addressId').isMongoId().withMessage('Valid address ID is required'),
  validateRequest
], deleteAddress);

// Account management
router.put('/deactivate', deactivateAccount);
router.put('/reactivate', reactivateAccount);

// User stats
router.get('/stats', getUserStats);

// Admin routes
router.get('/', restrictTo('admin'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['customer', 'provider', 'admin']),
  query('isActive').optional().isBoolean(),
  query('isVerified').optional().isBoolean(),
  validateRequest
], getAllUsers);

router.get('/statistics', restrictTo('admin'), getUserStatistics);

router.get('/:id', restrictTo('admin'), [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  validateRequest
], getUserById);

router.put('/:id', restrictTo('admin'), [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('name').optional().isString().trim(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['customer', 'provider', 'admin']),
  body('isVerified').optional().isBoolean(),
  validateRequest
], updateUser);

router.delete('/:id', restrictTo('admin'), [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  validateRequest
], deleteUser);

router.put('/:id/status', restrictTo('admin'), [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('isActive').isBoolean().withMessage('Active status is required'),
  body('reason').optional().isString(),
  validateRequest
], toggleUserStatus);

export default router;
