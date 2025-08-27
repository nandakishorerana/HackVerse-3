import Razorpay from 'razorpay';
import { config } from '@/config/env';
import logger from '@/config/logger';
import { IBooking } from '@/types';

interface PaymentOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentService {
  private razorpay: Razorpay | null = null;

  constructor() {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      logger.warn('Razorpay credentials not found. Payment features will be limited.');
      return;
    }

    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  /**
   * Create a payment order with Razorpay
   */
  async createPaymentOrder(
    amount: number,
    currency: string = 'INR',
    receipt?: string,
    notes?: any
  ): Promise<PaymentOrderResponse> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {}
      });

      logger.info(`Payment order created: ${order.id}`);

      return {
        id: order.id,
        amount: order.amount / 100, // Convert back to rupees
        currency: order.currency,
        status: order.status
      };
    } catch (error) {
      logger.error('Failed to create payment order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Create booking payment order
   */
  async createBookingPaymentOrder(booking: IBooking): Promise<PaymentOrderResponse> {
    const amount = booking.pricing.totalAmount;
    const receipt = `booking_${booking.bookingNumber}`;
    const notes = {
      booking_id: booking._id.toString(),
      booking_number: booking.bookingNumber,
      customer_id: booking.customer.toString(),
      provider_id: booking.provider.toString(),
      service_id: booking.service.toString()
    };

    return this.createPaymentOrder(amount, 'INR', receipt, notes);
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(data: PaymentVerificationData): boolean {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
        .digest('hex');

      return expectedSignature === data.razorpay_signature;
    } catch (error) {
      logger.error('Failed to verify payment signature:', error);
      return false;
    }
  }

  /**
   * Capture payment
   */
  async capturePayment(paymentId: string, amount: number): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const payment = await this.razorpay.payments.capture(
        paymentId,
        amount * 100, // Convert to paise
        'INR'
      );

      logger.info(`Payment captured: ${paymentId}`);
      return payment;
    } catch (error) {
      logger.error('Failed to capture payment:', error);
      throw new Error('Failed to capture payment');
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    notes?: any
  ): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const refundData: any = {
        notes: notes || {}
      };

      if (amount) {
        refundData.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);

      logger.info(`Payment refunded: ${paymentId}, Refund ID: ${refund.id}`);
      return refund;
    } catch (error) {
      logger.error('Failed to refund payment:', error);
      throw new Error('Failed to refund payment');
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      logger.error('Failed to get payment details:', error);
      throw new Error('Failed to get payment details');
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      logger.error('Failed to get order details:', error);
      throw new Error('Failed to get order details');
    }
  }

  /**
   * Get refund details
   */
  async getRefundDetails(refundId: string): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund;
    } catch (error) {
      logger.error('Failed to get refund details:', error);
      throw new Error('Failed to get refund details');
    }
  }

  /**
   * Create payment link
   */
  async createPaymentLink(
    amount: number,
    description: string,
    customerDetails: {
      name: string;
      email: string;
      contact: string;
    },
    callbackUrl?: string
  ): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const paymentLink = await this.razorpay.paymentLink.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        description,
        customer: customerDetails,
        notify: {
          sms: true,
          email: true
        },
        reminder_enable: true,
        callback_url: callbackUrl || `${config.frontendUrl}/payment/callback`,
        callback_method: 'get'
      });

      logger.info(`Payment link created: ${paymentLink.id}`);
      return paymentLink;
    } catch (error) {
      logger.error('Failed to create payment link:', error);
      throw new Error('Failed to create payment link');
    }
  }

  /**
   * Create QR code payment
   */
  async createQRPayment(
    amount: number,
    description: string,
    notes?: any
  ): Promise<any> {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const qrCode = await this.razorpay.qrCode.create({
        type: 'upi_qr',
        name: 'Deshi Sahayak Hub',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amount * 100, // Convert to paise
        description,
        notes: notes || {}
      });

      logger.info(`QR code created: ${qrCode.id}`);
      return qrCode;
    } catch (error) {
      logger.error('Failed to create QR payment:', error);
      throw new Error('Failed to create QR payment');
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(body: string, signature: string, secret: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Failed to validate webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: any): Promise<void> {
    try {
      logger.info(`Processing webhook event: ${event.event}`);

      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;
        case 'refund.created':
          await this.handleRefundCreated(event.payload.refund.entity);
          break;
        case 'order.paid':
          await this.handleOrderPaid(event.payload.order.entity);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      logger.error('Failed to process webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle payment captured event
   */
  private async handlePaymentCaptured(payment: any): Promise<void> {
    logger.info(`Payment captured: ${payment.id}`);
    
    // Import Booking model dynamically to avoid circular dependency
    const Booking = (await import('@/models/Booking.model')).default;
    
    // Find booking by order ID from payment notes
    if (payment.notes && payment.notes.booking_id) {
      const booking = await Booking.findById(payment.notes.booking_id);
      if (booking) {
        await booking.updatePaymentStatus(
          'paid',
          payment.id,
          'razorpay',
          payment.amount / 100 // Convert from paise
        );
        logger.info(`Booking payment updated: ${booking.bookingNumber}`);
      }
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(payment: any): Promise<void> {
    logger.info(`Payment failed: ${payment.id}`);
    
    // Import Booking model dynamically to avoid circular dependency
    const Booking = (await import('@/models/Booking.model')).default;
    
    // Find booking by order ID from payment notes
    if (payment.notes && payment.notes.booking_id) {
      const booking = await Booking.findById(payment.notes.booking_id);
      if (booking) {
        await booking.updatePaymentStatus('failed', payment.id, 'razorpay');
        logger.info(`Booking payment failed: ${booking.bookingNumber}`);
      }
    }
  }

  /**
   * Handle refund created event
   */
  private async handleRefundCreated(refund: any): Promise<void> {
    logger.info(`Refund created: ${refund.id}`);
    
    // Import Booking model dynamically to avoid circular dependency
    const Booking = (await import('@/models/Booking.model')).default;
    
    // Update booking refund status
    const payment = await this.getPaymentDetails(refund.payment_id);
    if (payment.notes && payment.notes.booking_id) {
      const booking = await Booking.findById(payment.notes.booking_id);
      if (booking) {
        booking.payment.refundTransactionId = refund.id;
        booking.payment.refundAmount = refund.amount / 100; // Convert from paise
        booking.payment.refundedAt = new Date();
        booking.payment.status = refund.amount === payment.amount ? 'refunded' : 'partially_refunded';
        await booking.save();
        logger.info(`Booking refund processed: ${booking.bookingNumber}`);
      }
    }
  }

  /**
   * Handle order paid event
   */
  private async handleOrderPaid(order: any): Promise<void> {
    logger.info(`Order paid: ${order.id}`);
    // Additional order paid handling if needed
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount: number): { fee: number; netAmount: number } {
    const feePercentage = 0.05; // 5% platform fee
    const fee = Math.round(amount * feePercentage);
    const netAmount = amount - fee;

    return { fee, netAmount };
  }

  /**
   * Calculate GST
   */
  calculateGST(amount: number, rate: number = 0.18): { gst: number; totalAmount: number } {
    const gst = Math.round(amount * rate);
    const totalAmount = amount + gst;

    return { gst, totalAmount };
  }

  /**
   * Check if payment service is available
   */
  isAvailable(): boolean {
    return !!this.razorpay;
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'netbanking',
      'wallet',
      'upi',
      'emi'
    ];
  }
}

// Create and export a singleton instance
export const paymentService = new PaymentService();
export default paymentService;
