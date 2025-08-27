import mongoose, { Schema, Model } from 'mongoose';
import { INotification } from '@/types';

const NotificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
    index: true
  },
  type: {
    type: String,
    enum: {
      values: ['booking', 'payment', 'review', 'system', 'promotion'],
      message: 'Type must be one of: booking, payment, review, system, promotion'
    },
    required: [true, 'Notification type is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  data: {
    type: Schema.Types.Mixed,
    default: null
  },
  channels: [{
    type: String,
    enum: {
      values: ['push', 'email', 'sms'],
      message: 'Channel must be one of: push, email, sms'
    }
  }],
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'delivered', 'read', 'failed'],
      message: 'Status must be one of: pending, sent, delivered, read, failed'
    },
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Priority must be one of: low, normal, high, urgent'
    },
    default: 'normal',
    index: true
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      return ret;
    }
  }
});

// Indexes for better query performance
NotificationSchema.index({ recipient: 1, status: 1 });
NotificationSchema.index({ recipient: 1, type: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Instance Methods
NotificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

NotificationSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Static Methods
NotificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ 
    recipient: userId, 
    status: { $in: ['sent', 'delivered'] } 
  });
};

NotificationSchema.statics.markAllAsRead = function(userId: string) {
  return this.updateMany(
    { 
      recipient: userId, 
      status: { $in: ['sent', 'delivered'] } 
    },
    { 
      status: 'read',
      readAt: new Date()
    }
  );
};

NotificationSchema.statics.getRecentNotifications = function(userId: string, limit: number = 20) {
  return this.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('recipient', 'name email avatar');
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Auto-set sentAt if status is being changed to sent
  if (this.isModified('status') && (this as any).status === 'sent' && !(this as any).sentAt) {
    (this as any).sentAt = new Date();
  }
  
  // Auto-set readAt if status is being changed to read
  if (this.isModified('status') && (this as any).status === 'read' && !(this as any).readAt) {
    (this as any).readAt = new Date();
  }
  
  next();
});

// Export the model
const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
