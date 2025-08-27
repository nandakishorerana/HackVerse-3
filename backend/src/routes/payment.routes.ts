import express from 'express';
import {
  createOrder,
  verifyPayment,
  createPaymentLink,
  processRefund,
  getTransactions,
  razorpayWebhook,
  getPaymentStats
} from '@/controllers/payment.controller';
import { protect, restrictTo } from '@/middleware/auth.middleware';
import { validateRequest } from '@/middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Webhook route (before authentication)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

// Protected routes
router.use(protect);

// Create payment order
router.post('/create-order', [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  validateRequest
], createOrder);

// Verify payment
router.post('/verify', [
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Payment signature is required'),
  validateRequest
], verifyPayment);

// Create payment link
router.post('/payment-link', [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('description').optional().isString(),
  validateRequest
], createPaymentLink);

// Process refund
router.post('/refund', [
  body('paymentId').isMongoId().withMessage('Valid payment ID is required'),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('reason').optional().isString(),
  validateRequest
], processRefund);

// Get user transactions
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  validateRequest
], getTransactions);

// Admin routes
router.get('/admin/stats', restrictTo('admin'), getPaymentStats);

export default router;
