import { Notification } from '@/models';
import { User } from '@/models';
import { ServiceProvider } from '@/models';
import { emailService } from './email.service';
import smsService from './sms.service';
import { AppError } from '@/utils/AppError';
import { Types } from 'mongoose';

interface NotificationData {
  recipient: string;
  type: 'booking' | 'payment' | 'system' | 'promotion' | 'review' | 'provider';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: ('in_app' | 'email' | 'sms' | 'push')[];
  scheduledFor?: Date;
}

interface BulkNotificationData {
  recipients: string[];
  type: NotificationData['type'];
  title: string;
  message: string;
  data?: any;
  priority?: NotificationData['priority'];
  channels?: NotificationData['channels'];
  userFilter?: {
    role?: 'customer' | 'provider' | 'admin';
    location?: string;
    isActive?: boolean;
    isVerified?: boolean;
  };
}

class NotificationService {
  private emailService: typeof emailService;

  constructor() {
    this.emailService = emailService;
  }

  // Create and send a single notification
  async sendNotification(data: NotificationData): Promise<void> {
    try {
      // Create in-app notification
      const notification = await Notification.create({
        recipient: data.recipient,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        priority: data.priority || 'normal',
        channels: data.channels || ['in_app'],
        scheduledFor: data.scheduledFor || new Date(),
        status: data.scheduledFor && data.scheduledFor > new Date() ? 'scheduled' : 'sent'
      });

      // If scheduled for future, return early
      if (data.scheduledFor && data.scheduledFor > new Date()) {
        console.log(`Notification scheduled for ${data.scheduledFor}`);
        return;
      }

      // Get recipient details
      const user = await User.findById(data.recipient).select('email phone name preferences');
      if (!user) {
        throw new AppError('Recipient not found', 404);
      }

      // Send through requested channels
      const channels = data.channels || ['in_app'];
      
      await Promise.allSettled([
        // Email notification
        channels.includes('email') && user.preferences?.emailNotifications ? 
          this.sendEmailNotification(user.email, user.name, data) : Promise.resolve(),

        // SMS notification
        channels.includes('sms') && user.preferences?.smsNotifications ? 
          this.sendSMSNotification(user.phone, data) : Promise.resolve(),

        // Push notification
        channels.includes('push') && user.preferences?.pushNotifications ? 
          this.sendPushNotification(user._id.toString(), data) : Promise.resolve()
      ]);

      // Mark as delivered
      notification.deliveredAt = new Date();
      notification.status = 'delivered';
      await notification.save();

    } catch (error) {
      console.error('Notification sending error:', error);
      throw new AppError('Failed to send notification', 500);
    }
  }

  // Send bulk notifications
  async sendBulkNotification(data: BulkNotificationData): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    let recipients = data.recipients;

    // If userFilter is provided, get filtered users
    if (data.userFilter) {
      const users = await User.find(data.userFilter).select('_id');
      recipients = users.map(user => user._id.toString());
    }

    // Send to each recipient
    const promises = recipients.map(async (recipientId) => {
      try {
        await this.sendNotification({
          recipient: recipientId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          priority: data.priority,
          channels: data.channels
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send to ${recipientId}: ${error}`);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Send email notification
  private async sendEmailNotification(email: string, name: string, data: NotificationData): Promise<void> {
    try {
      // Use appropriate email method based on notification type
      if (data.type === 'system') {
        await this.emailService.sendSystemAnnouncementEmail(email, name, data.title, data.message);
      } else {
        // For other notification types, we'll use the system announcement format
        // In a real app, you might want separate email templates for different types
        await this.emailService.sendSystemAnnouncementEmail(email, name, data.title, data.message);
      }
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  // Send SMS notification
  private async sendSMSNotification(phone: string, data: NotificationData): Promise<void> {
    try {
      const message = `${data.title}\n${data.message}`;
      
      if (data.type === 'booking' && data.data?.bookingDetails) {
        if (data.data.status === 'confirmed') {
          await smsService.sendBookingConfirmation(phone, data.data.bookingDetails);
        } else {
          await smsService.sendBookingStatusUpdate(phone, {
            bookingId: data.data.bookingDetails.bookingId,
            status: data.data.status,
            serviceName: data.data.bookingDetails.serviceName,
            message: data.message
          });
        }
      } else if (data.type === 'payment' && data.data?.paymentDetails) {
        await smsService.sendPaymentConfirmation(phone, data.data.paymentDetails);
      } else {
        // Generic SMS
        const smsMessage = `${data.title}\n${data.message}\n- Deshi Sahayak`;
        await smsService.sendPromotionalSMS(phone, smsMessage);
      }
    } catch (error) {
      console.error('SMS notification error:', error);
    }
  }

  // Send push notification (placeholder - would integrate with FCM/APNS)
  private async sendPushNotification(userId: string, data: NotificationData): Promise<void> {
    try {
      // This would integrate with Firebase Cloud Messaging or Apple Push Notification Service
      console.log(`Push notification sent to ${userId}:`, {
        title: data.title,
        body: data.message,
        data: data.data
      });

      // In a real implementation:
      // - Get user's FCM token from database
      // - Send push notification using FCM SDK
      // - Handle device token management
      // - Track delivery status
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Get user's notifications with pagination
  async getUserNotifications(userId: string, options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  } = {}): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = { recipient: userId };
    
    if (options.unreadOnly) {
      filter.readAt = { $exists: false };
    }
    
    if (options.type) {
      filter.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      Notification.countDocuments(filter),
      
      Notification.countDocuments({ 
        recipient: userId, 
        readAt: { $exists: false } 
      })
    ]);

    return { notifications, total, unreadCount };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { readAt: new Date() }
    );
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { recipient: userId, readAt: { $exists: false } },
      { readAt: new Date() }
    );
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  }

  // Get notification statistics
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: { [key: string]: number };
    recent: number;
  }> {
    const stats = await Notification.aggregate([
      { $match: { recipient: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $exists: ['$readAt', false] }, 1, 0] } },
          recent: { 
            $sum: { 
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      { $match: { recipient: new Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byType: { [key: string]: number } = {};
    typeStats.forEach(stat => {
      byType[stat._id] = stat.count;
    });

    return {
      total: stats[0]?.total || 0,
      unread: stats[0]?.unread || 0,
      recent: stats[0]?.recent || 0,
      byType
    };
  }

  // Predefined notification templates
  async sendBookingNotification(recipientId: string, type: 'created' | 'confirmed' | 'completed' | 'cancelled', bookingData: any): Promise<void> {
    const templates = {
      created: {
        title: 'Booking Created',
        message: `Your booking for ${bookingData.serviceName} has been created and is pending confirmation.`
      },
      confirmed: {
        title: 'Booking Confirmed',
        message: `Your booking for ${bookingData.serviceName} has been confirmed by ${bookingData.providerName}.`
      },
      completed: {
        title: 'Service Completed',
        message: `Your ${bookingData.serviceName} service has been completed. Please rate your experience.`
      },
      cancelled: {
        title: 'Booking Cancelled',
        message: `Your booking for ${bookingData.serviceName} has been cancelled.`
      }
    };

    const template = templates[type];
    await this.sendNotification({
      recipient: recipientId,
      type: 'booking',
      title: template.title,
      message: template.message,
      data: { bookingDetails: bookingData, status: type },
      channels: ['in_app', 'email', 'sms']
    });
  }

  async sendPaymentNotification(recipientId: string, type: 'success' | 'failed' | 'refunded', paymentData: any): Promise<void> {
    const templates = {
      success: {
        title: 'Payment Successful',
        message: `Your payment of ₹${paymentData.amount} has been processed successfully.`
      },
      failed: {
        title: 'Payment Failed',
        message: `Your payment of ₹${paymentData.amount} could not be processed. Please try again.`
      },
      refunded: {
        title: 'Refund Processed',
        message: `Your refund of ₹${paymentData.amount} has been processed and will reflect in your account soon.`
      }
    };

    const template = templates[type];
    await this.sendNotification({
      recipient: recipientId,
      type: 'payment',
      title: template.title,
      message: template.message,
      data: { paymentDetails: paymentData, status: type },
      channels: ['in_app', 'email', 'sms']
    });
  }

  async sendProviderNotification(recipientId: string, type: 'new_booking' | 'verification' | 'review', data: any): Promise<void> {
    const templates = {
      new_booking: {
        title: 'New Booking Received',
        message: `You have received a new booking for ${data.serviceName}. Please confirm or decline.`
      },
      verification: {
        title: 'Verification Update',
        message: data.verified ? 'Congratulations! Your account has been verified.' : 'Your account verification is pending review.'
      },
      review: {
        title: 'New Review',
        message: `You have received a new ${data.rating}-star review for ${data.serviceName}.`
      }
    };

    const template = templates[type];
    await this.sendNotification({
      recipient: recipientId,
      type: 'provider',
      title: template.title,
      message: template.message,
      data,
      channels: ['in_app', 'email', 'sms']
    });
  }

  // Process scheduled notifications
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const scheduledNotifications = await Notification.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    });

    for (const notification of scheduledNotifications) {
      try {
        await this.sendNotification({
          recipient: notification.recipient.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          channels: notification.channels
        });
      } catch (error) {
        console.error('Error processing scheduled notification:', error);
        notification.status = 'failed';
        await notification.save();
      }
    }
  }
}

export { NotificationService };
export default new NotificationService();
