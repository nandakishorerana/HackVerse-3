import nodemailer from 'nodemailer';
import { config } from '@/config/env';
import logger from '@/config/logger';
import { IEmailTemplate, IUser, IBooking } from '@/types';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  /**
   * Send email
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${config.email.fromName} <${config.email.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '');
  }

  /**
   * Generate email verification email
   */
  async sendEmailVerification(user: IUser, token: string): Promise<boolean> {
    const verificationUrl = `${config.frontendUrl}/verify-email/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #4f46e5; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Deshi Sahayak Hub!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Thank you for registering with Deshi Sahayak Hub. Please verify your email address to get started.</p>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>Or copy and paste this link in your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Deshi Sahayak Hub',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user: IUser, token: string): Promise<boolean> {
    const resetUrl = `${config.frontendUrl}/reset-password/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #ef4444; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>We received a request to reset your password for your Deshi Sahayak Hub account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link in your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <div class="warning">
                <p><strong>Security Notice:</strong></p>
                <ul>
                  <li>This link will expire in 10 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - Deshi Sahayak Hub',
      html
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(user: IUser, booking: any): Promise<boolean> {
    const bookingUrl = `${config.frontendUrl}/bookings/${booking._id}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Your service booking has been confirmed. Here are the details:</p>
              
              <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
                <p><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
                <p><strong>Date & Time:</strong> ${new Date(booking.scheduledDate).toLocaleString()}</p>
                <p><strong>Address:</strong> ${booking.address.street}, ${booking.address.city}, ${booking.address.state} - ${booking.address.pincode}</p>
                <p><strong>Total Amount:</strong> ₹${booking.pricing.totalAmount}</p>
                <p><strong>Contact Phone:</strong> ${booking.contactPhone}</p>
                ${booking.specialInstructions ? `<p><strong>Special Instructions:</strong> ${booking.specialInstructions}</p>` : ''}
              </div>
              
              <p>You can view and manage your booking by clicking below:</p>
              <a href="${bookingUrl}" class="button">View Booking</a>
              
              <p>We'll send you updates about your booking status. Thank you for choosing Deshi Sahayak Hub!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Booking Confirmed - ${booking.bookingNumber}`,
      html
    });
  }

  /**
   * Send booking status update email
   */
  async sendBookingStatusUpdate(user: IUser, booking: any, newStatus: string): Promise<boolean> {
    const statusMessages = {
      confirmed: 'Your booking has been confirmed by the service provider.',
      'in-progress': 'Your service provider has started working on your booking.',
      completed: 'Your booking has been completed successfully.',
      cancelled: 'Your booking has been cancelled.',
      'no-show': 'Your booking was marked as no-show.'
    };

    const statusColors = {
      confirmed: '#10b981',
      'in-progress': '#3b82f6',
      completed: '#059669',
      cancelled: '#ef4444',
      'no-show': '#f59e0b'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || 'Your booking status has been updated.';
    const color = statusColors[newStatus as keyof typeof statusColors] || '#6b7280';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status-badge { 
              display: inline-block; 
              background: ${color}; 
              color: white; 
              padding: 5px 15px; 
              border-radius: 20px; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Status Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>${message}</p>
              
              <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
                <p><strong>Status:</strong> <span class="status-badge">${newStatus.replace('-', ' ')}</span></p>
                <p><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
                <p><strong>Scheduled Date:</strong> ${new Date(booking.scheduledDate).toLocaleString()}</p>
              </div>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Booking ${newStatus.replace('-', ' ')} - ${booking.bookingNumber}`,
      html
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const user = { email, name };
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .services-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
            .service-item { 
              background: white; 
              padding: 10px; 
              border-radius: 5px; 
              flex: 1; 
              min-width: 150px; 
              text-align: center; 
            }
            .button { 
              display: inline-block; 
              background: #4f46e5; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Deshi Sahayak Hub! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Welcome to Deshi Sahayak Hub - your trusted platform for local home services in tier-2 and tier-3 cities!</p>
              
              <h3>What can you do with Deshi Sahayak Hub?</h3>
              <div class="services-grid">
                <div class="service-item">
                  <h4>🏠 House Cleaning</h4>
                  <p>Professional cleaning services</p>
                </div>
                <div class="service-item">
                  <h4>🔧 Plumbing</h4>
                  <p>Expert repair and maintenance</p>
                </div>
                <div class="service-item">
                  <h4>⚡ Electrical</h4>
                  <p>Safe electrical repairs</p>
                </div>
                <div class="service-item">
                  <h4>🔨 Carpentry</h4>
                  <p>Custom woodwork services</p>
                </div>
              </div>
              
              <h3>Getting Started:</h3>
              <ol>
                <li>Browse our services or search for what you need</li>
                <li>Choose a verified service provider</li>
                <li>Schedule your service at your convenience</li>
                <li>Pay securely after the work is completed</li>
                <li>Leave a review to help others</li>
              </ol>
              
              <a href="${config.frontendUrl}/services" class="button">Browse Services</a>
              
              <p>If you have any questions, our support team is here to help!</p>
              <p>Email: support@deshisahayak.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
              <p>Building trust in local communities, one service at a time.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Deshi Sahayak Hub!',
      html
    });
  }

  /**
   * Send service provider application confirmation
   */
  async sendProviderApplicationConfirmation(user: IUser): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Service Provider Application Received</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Thank you for applying to become a service provider with Deshi Sahayak Hub!</p>
              
              <div class="status-box">
                <p><strong>Application Status:</strong> Under Review</p>
                <p><strong>Review Timeline:</strong> 2-3 business days</p>
              </div>
              
              <h3>What happens next?</h3>
              <ol>
                <li><strong>Document Verification:</strong> We'll review your submitted documents</li>
                <li><strong>Background Check:</strong> We'll verify your professional credentials</li>
                <li><strong>Approval:</strong> Upon successful verification, you'll be approved</li>
                <li><strong>Onboarding:</strong> We'll help you set up your profile and start receiving bookings</li>
              </ol>
              
              <h3>Required Documents:</h3>
              <ul>
                <li>Government-issued ID proof</li>
                <li>Address proof</li>
                <li>Professional certificates (if applicable)</li>
                <li>Experience certificates</li>
              </ul>
              
              <p>If you have any questions about the application process, feel free to reach out to our team.</p>
              <p>Email: providers@deshisahayak.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Service Provider Application Received - Deshi Sahayak Hub',
      html
    });
  }

  /**
   * Send system announcement email
   */
  async sendSystemAnnouncementEmail(email: string, name: string, title: string, message: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .announcement-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 System Announcement</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <div class="announcement-box">
                <h3>${title}</h3>
                <p>${message}</p>
              </div>
              <p>Thank you for using Deshi Sahayak Hub.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `System Announcement: ${title}`,
      html
    });
  }

  /**
   * Send account deactivation email
   */
  async sendAccountDeactivationEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .warning-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Deactivated</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <div class="warning-box">
                <p><strong>Your account has been deactivated.</strong></p>
                <p>This means you will no longer be able to access our services or log into your account.</p>
              </div>
              <p>If you believe this is an error or would like to reactivate your account, please contact our support team.</p>
              <p>Email: support@deshisahayak.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Account Deactivated - Deshi Sahayak Hub',
      html
    });
  }

  /**
   * Send account status change email
   */
  async sendAccountStatusEmail(email: string, name: string, action: string, reason?: string): Promise<boolean> {
    const isActivation = action === 'activate';
    const statusColor = isActivation ? '#10b981' : '#ef4444';
    const statusText = isActivation ? 'Activated' : 'Suspended';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status-box { background: ${isActivation ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isActivation ? '#bbf7d0' : '#fecaca'}; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account ${statusText}</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <div class="status-box">
                <p><strong>Your account has been ${statusText.toLowerCase()}.</strong></p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              ${isActivation ? 
                '<p>You can now log in and access all our services.</p>' : 
                '<p>You will not be able to access your account until it is reactivated.</p>'
              }
              <p>If you have any questions, please contact our support team.</p>
              <p>Email: support@deshisahayak.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Deshi Sahayak Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Account ${statusText} - Deshi Sahayak Hub`,
      html
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const emailService = new EmailService();
export default emailService;
