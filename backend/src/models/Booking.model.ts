import mongoose, { Schema, Model } from 'mongoose';
import { IBooking, IStatusChange, IPricing, IAdditionalCharge, IPaymentInfo, IWorkSummary } from '@/types';
import crypto from 'crypto';

// Status Change Schema
const StatusChangeSchema = new Schema<IStatusChange>({
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      message: 'Invalid status'
    }
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Status changer is required']
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    trim: true
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comments cannot exceed 500 characters']
  }
}, { _id: false });

// Additional Charge Schema
const AdditionalChargeSchema = new Schema<IAdditionalCharge>({
  name: {
    type: String,
    required: [true, 'Charge name is required'],
    trim: true,
    maxlength: [100, 'Charge name cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Charge amount is required'],
    min: [0, 'Charge amount cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, { _id: false });

// Pricing Schema
const PricingSchema = new Schema<IPricing>({
  baseAmount: {
    type: Number,
    required: [true, 'Base amount is required'],
    min: [0, 'Base amount cannot be negative']
  },
  additionalCharges: [AdditionalChargeSchema],
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  discountType: {
    type: String,
    enum: {
      values: ['percentage', 'fixed'],
      message: 'Discount type must be percentage or fixed'
    }
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  }
}, { _id: false });

// Payment Info Schema
const PaymentInfoSchema = new Schema<IPaymentInfo>({
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  method: {
    type: String,
    enum: {
      values: ['razorpay', 'stripe', 'cash', 'upi'],
      message: 'Invalid payment method'
    }
  },
  transactionId: {
    type: String,
    trim: true
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  paidAt: {
    type: Date
  },
  refundTransactionId: {
    type: String,
    trim: true
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundedAt: {
    type: Date
  }
}, { _id: false });

// Work Summary Schema
const WorkSummarySchema = new Schema<IWorkSummary>({
  workStartTime: {
    type: Date
  },
  workEndTime: {
    type: Date
  },
  workDescription: {
    type: String,
    trim: true,
    maxlength: [1000, 'Work description cannot exceed 1000 characters']
  },
  beforeImages: {
    type: [String],
    validate: {
      validator: function(images: string[]) {
        return images.length <= 10;
      },
      message: 'Cannot have more than 10 before images'
    }
  },
  afterImages: {
    type: [String],
    validate: {
      validator: function(images: string[]) {
        return images.length <= 10;
      },
      message: 'Cannot have more than 10 after images'
    }
  },
  materialsUsed: {
    type: [String],
    validate: {
      validator: function(materials: string[]) {
        return materials.length <= 50;
      },
      message: 'Cannot have more than 50 materials'
    }
  },
  additionalNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Additional notes cannot exceed 500 characters']
  }
}, { _id: false });

// Address Schema (embedded from User model)
const BookingAddressSchema = new Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  }
}, { _id: false });

// Booking Schema
const BookingSchema = new Schema<IBooking>({
  bookingNumber: {
    type: String,
    unique: true,
    required: [true, 'Booking number is required']
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: [true, 'Provider is required']
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    validate: {
      validator: function(date: Date) {
        return date > new Date();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [1440, 'Duration cannot exceed 24 hours']
  },
  actualDuration: {
    type: Number,
    min: [1, 'Actual duration must be at least 1 minute'],
    max: [1440, 'Actual duration cannot exceed 24 hours']
  },
  address: {
    type: BookingAddressSchema,
    required: [true, 'Service address is required']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      message: 'Invalid booking status'
    },
    default: 'pending'
  },
  statusHistory: [StatusChangeSchema],
  pricing: {
    type: PricingSchema,
    required: [true, 'Pricing information is required']
  },
  payment: {
    type: PaymentInfoSchema,
    required: [true, 'Payment information is required']
  },
  workSummary: {
    type: WorkSummarySchema
  },
  cancelledBy: {
    type: String,
    enum: {
      values: ['customer', 'provider', 'admin'],
      message: 'Invalid cancellation source'
    }
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancellationDate: {
    type: Date
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
BookingSchema.index({ bookingNumber: 1 });
BookingSchema.index({ customer: 1 });
BookingSchema.index({ provider: 1 });
BookingSchema.index({ service: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ scheduledDate: 1 });
BookingSchema.index({ 'payment.status': 1 });
BookingSchema.index({ createdAt: -1 });

// Compound indexes
BookingSchema.index({ customer: 1, status: 1, scheduledDate: -1 });
BookingSchema.index({ provider: 1, status: 1, scheduledDate: -1 });
BookingSchema.index({ status: 1, scheduledDate: 1 });
BookingSchema.index({ 'address.city': 1, status: 1 });

// Virtual for booking age
BookingSchema.virtual('bookingAge').get(function(this: IBooking) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for time until service
BookingSchema.virtual('timeUntilService').get(function(this: IBooking) {
  const now = new Date();
  const diffTime = this.scheduledDate.getTime() - now.getTime();
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return diffHours;
});

// Generate booking number
function generateBookingNumber(): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK${timestamp.slice(-6)}${randomBytes}`;
}

// Pre-save middleware to generate booking number
BookingSchema.pre('save', function(next) {
  if (!this.bookingNumber) {
    this.bookingNumber = generateBookingNumber();
  }
  
  // Add status to history if status changed
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.customer, // This should be set properly in the controller
      changedAt: new Date()
    } as IStatusChange);
  }
  
  next();
});

// Static method to find bookings by customer
BookingSchema.statics.findByCustomer = function(
  customerId: string,
  status?: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const query: any = { customer: customerId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('provider', 'user rating totalReviews')
    .populate({
      path: 'provider',
      populate: {
        path: 'user',
        select: 'name avatar phone'
      }
    })
    .populate('service', 'name category basePrice duration')
    .sort({ scheduledDate: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find bookings by provider
BookingSchema.statics.findByProvider = function(
  providerId: string,
  status?: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const query: any = { provider: providerId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('customer', 'name avatar phone email')
    .populate('service', 'name category basePrice duration')
    .sort({ scheduledDate: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get today's bookings
BookingSchema.statics.getTodaysBookings = function(providerId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const query: any = {
    scheduledDate: {
      $gte: today,
      $lt: tomorrow
    },
    status: { $in: ['confirmed', 'in-progress'] }
  };
  
  if (providerId) {
    query.provider = providerId;
  }
  
  return this.find(query)
    .populate('customer', 'name phone')
    .populate('provider', 'user')
    .populate('service', 'name duration')
    .sort({ scheduledDate: 1 });
};

// Static method to get upcoming bookings
BookingSchema.statics.getUpcomingBookings = function(
  userId: string,
  userType: 'customer' | 'provider',
  limit = 10
) {
  const query: any = {
    scheduledDate: { $gt: new Date() },
    status: { $in: ['pending', 'confirmed'] }
  };
  
  if (userType === 'customer') {
    query.customer = userId;
  } else {
    query.provider = userId;
  }
  
  const populateOptions = userType === 'customer' 
    ? [
        { path: 'provider', select: 'user rating', populate: { path: 'user', select: 'name avatar phone' } },
        { path: 'service', select: 'name category duration' }
      ]
    : [
        { path: 'customer', select: 'name avatar phone' },
        { path: 'service', select: 'name category duration' }
      ];
  
  return this.find(query)
    .populate(populateOptions)
    .sort({ scheduledDate: 1 })
    .limit(limit);
};

// Instance method to update status
BookingSchema.methods.updateStatus = function(
  newStatus: string,
  changedBy: string,
  reason?: string,
  comments?: string
) {
  this.status = newStatus;
  
  // Handle specific status changes
  if (newStatus === 'cancelled') {
    this.cancellationDate = new Date();
    this.cancellationReason = reason;
  }
  
  if (newStatus === 'in-progress' && !this.workSummary?.workStartTime) {
    if (!this.workSummary) {
      this.workSummary = {} as IWorkSummary;
    }
    this.workSummary.workStartTime = new Date();
  }
  
  if (newStatus === 'completed' && this.workSummary && !this.workSummary.workEndTime) {
    this.workSummary.workEndTime = new Date();
    
    // Calculate actual duration
    if (this.workSummary.workStartTime) {
      const durationMs = this.workSummary.workEndTime.getTime() - this.workSummary.workStartTime.getTime();
      this.actualDuration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    }
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy: new mongoose.Types.ObjectId(changedBy),
    changedAt: new Date(),
    reason,
    comments
  } as IStatusChange);
  
  return this.save();
};

// Instance method to calculate refund amount
BookingSchema.methods.calculateRefundAmount = function(): number {
  const now = new Date();
  const scheduledTime = this.scheduledDate.getTime();
  const currentTime = now.getTime();
  const hoursUntilService = (scheduledTime - currentTime) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  
  if (hoursUntilService > 24) {
    refundPercentage = 1.0; // 100% refund
  } else if (hoursUntilService > 12) {
    refundPercentage = 0.75; // 75% refund
  } else if (hoursUntilService > 2) {
    refundPercentage = 0.5; // 50% refund
  } else {
    refundPercentage = 0.25; // 25% refund
  }
  
  return Math.round(this.pricing.totalAmount * refundPercentage);
};

// Instance method to add work summary
BookingSchema.methods.addWorkSummary = function(workSummary: Partial<IWorkSummary>) {
  if (!this.workSummary) {
    this.workSummary = {} as IWorkSummary;
  }
  
  Object.assign(this.workSummary, workSummary);
  return this.save();
};

// Instance method to update payment status
BookingSchema.methods.updatePaymentStatus = function(
  status: string,
  transactionId?: string,
  method?: string,
  amount?: number
) {
  this.payment.status = status as any;
  
  if (transactionId) {
    this.payment.transactionId = transactionId;
  }
  
  if (method) {
    this.payment.method = method as any;
  }
  
  if (amount) {
    this.payment.paidAmount = amount;
    this.payment.paidAt = new Date();
  }
  
  return this.save();
};

// Export the model
const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', BookingSchema);
export default Booking;
