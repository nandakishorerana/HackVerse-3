import twilio from 'twilio';
import { AppError } from '@/utils/AppError';

class SMSService {
  private client: twilio.Twilio;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials are not properly configured');
    }

    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  // Format phone number to international format
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add country code
    if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
      return `+91${cleaned}`;
    }
    
    // If it already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // If it already has + prefix
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Default to adding +91 for Indian numbers
    return `+91${cleaned}`;
  }

  // Send OTP for verification
  async sendOTP(phone: string, otp: string): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = `Your Deshi Sahayak verification code is: ${otp}. Valid for 10 minutes. Don't share this code with anyone.`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`OTP sent to ${formattedPhone}`);
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new AppError('Failed to send SMS. Please try again.', 500);
    }
  }

  // Send booking confirmation SMS
  async sendBookingConfirmation(phone: string, bookingDetails: {
    bookingId: string;
    serviceName: string;
    providerName: string;
    scheduledDate: Date;
    amount: number;
  }): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const date = bookingDetails.scheduledDate.toLocaleDateString('en-IN');
      const time = bookingDetails.scheduledDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const message = `Booking Confirmed! 
Service: ${bookingDetails.serviceName}
Provider: ${bookingDetails.providerName}
Date: ${date} at ${time}
Amount: ₹${bookingDetails.amount}
Booking ID: ${bookingDetails.bookingId}
Thank you for choosing Deshi Sahayak!`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Booking confirmation sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Booking SMS error:', error);
      // Don't throw error for notifications to avoid breaking the booking flow
    }
  }

  // Send booking status update SMS
  async sendBookingStatusUpdate(phone: string, details: {
    bookingId: string;
    status: string;
    serviceName: string;
    message?: string;
  }): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      let statusMessage = '';
      switch (details.status) {
        case 'confirmed':
          statusMessage = 'Your booking has been confirmed by the service provider.';
          break;
        case 'in-progress':
          statusMessage = 'Your service provider is on the way!';
          break;
        case 'completed':
          statusMessage = 'Your service has been completed. Please rate your experience.';
          break;
        case 'cancelled':
          statusMessage = 'Your booking has been cancelled.';
          break;
        default:
          statusMessage = `Booking status updated to: ${details.status}`;
      }

      const message = `${statusMessage}
Service: ${details.serviceName}
Booking ID: ${details.bookingId}${details.message ? `\nNote: ${details.message}` : ''}
- Deshi Sahayak`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Status update sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Status SMS error:', error);
    }
  }

  // Send payment confirmation SMS
  async sendPaymentConfirmation(phone: string, details: {
    bookingId: string;
    amount: number;
    paymentId: string;
  }): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const message = `Payment Successful!
Amount: ₹${details.amount}
Booking ID: ${details.bookingId}
Payment ID: ${details.paymentId}
Thank you for using Deshi Sahayak!`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Payment confirmation sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Payment SMS error:', error);
    }
  }

  // Send provider notification SMS
  async sendProviderNotification(phone: string, details: {
    type: 'new_booking' | 'booking_cancelled' | 'verification_update';
    message: string;
    bookingId?: string;
  }): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      let title = '';
      switch (details.type) {
        case 'new_booking':
          title = 'New Booking Received!';
          break;
        case 'booking_cancelled':
          title = 'Booking Cancelled';
          break;
        case 'verification_update':
          title = 'Account Update';
          break;
      }

      const message = `${title}
${details.message}${details.bookingId ? `\nBooking ID: ${details.bookingId}` : ''}
- Deshi Sahayak`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Provider notification sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Provider SMS error:', error);
    }
  }

  // Send welcome SMS to new users
  async sendWelcomeSMS(phone: string, name: string): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const message = `Welcome to Deshi Sahayak, ${name}! 🎉
Find trusted local service providers in your area. Book services, make payments, and rate your experience - all in one place.
Start exploring now!`;

      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Welcome SMS sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Welcome SMS error:', error);
    }
  }

  // Send promotional SMS (with opt-out option)
  async sendPromotionalSMS(phone: string, message: string): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const fullMessage = `${message}

Reply STOP to opt-out from promotional messages.
- Deshi Sahayak`;

      await this.client.messages.create({
        body: fullMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`Promotional SMS sent to ${formattedPhone}`);
    } catch (error) {
      console.error('Promotional SMS error:', error);
      throw new AppError('Failed to send promotional SMS', 500);
    }
  }

  // Send bulk SMS to multiple recipients
  async sendBulkSMS(phones: string[], message: string): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    const promises = phones.map(async (phone) => {
      try {
        const formattedPhone = this.formatPhoneNumber(phone);
        await this.client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send to ${phone}: ${error}`);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Check SMS delivery status
  async getMessageStatus(messageSid: string): Promise<any> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      throw new AppError('Failed to fetch message status', 500);
    }
  }

  // Get account balance (for monitoring)
  async getAccountBalance(): Promise<string> {
    try {
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return account.balance;
    } catch (error) {
      throw new AppError('Failed to fetch account balance', 500);
    }
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    const formattedPhone = this.formatPhoneNumber(phone);
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    return phoneRegex.test(formattedPhone);
  }

  // Generate and send OTP with rate limiting
  async sendOTPWithRateLimit(phone: string, otp: string, rateLimitKey: string): Promise<void> {
    // In a real implementation, you'd use Redis to track rate limits
    // For now, we'll just send the OTP
    await this.sendOTP(phone, otp);
  }
}

export { SMSService };
export default new SMSService();
