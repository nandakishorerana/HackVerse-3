import express from 'express';
import {
  getAllServices,
  getServiceById,
  getServicesByCategory,
  searchServices,
  getPopularServices,
  getServiceCategories,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getServiceStats
} from '@/controllers/service.controller';
import { protect, restrictTo } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/popular', getPopularServices);
router.get('/categories', getServiceCategories);
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  validateRequest
], searchServices);
router.get('/category/:category', [
  param('category').notEmpty().withMessage('Category is required'),
  validateRequest
], getServicesByCategory);
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid service ID is required'),
  validateRequest
], getServiceById);

// Protected routes - Admin only
router.use(protect, restrictTo('admin'));

router.post('/', [
  body('name').notEmpty().withMessage('Service name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('basePrice').isNumeric().withMessage('Base price must be a number'),
  body('priceUnit').isIn(['fixed', 'hourly', 'square_foot', 'per_item']).withMessage('Invalid price unit'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  validateRequest
], createService);

router.put('/:id', [
  param('id').isMongoId().withMessage('Valid service ID is required'),
  validateRequest
], updateService);

router.delete('/:id', [
  param('id').isMongoId().withMessage('Valid service ID is required'),
  validateRequest
], deleteService);

router.patch('/:id/toggle-status', [
  param('id').isMongoId().withMessage('Valid service ID is required'),
  validateRequest
], toggleServiceStatus);

router.get('/admin/stats', getServiceStats);

export default router;
