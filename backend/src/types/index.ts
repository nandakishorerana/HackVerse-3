import { Document, Types } from 'mongoose';
import { Request } from 'express';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'provider' | 'admin';
  avatar?: string;
  address?: IAddress;
  addresses?: IAddress[];
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language?: string;
    currency?: string;
  };
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phoneVerificationToken?: string;
  phoneVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  loginCount?: number;
  lockUntil?: Date;
  statusReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  isLocked(): boolean;
  incLoginAttempts(): Promise<IUser>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  generatePhoneVerificationToken(): string;
}

// Address Interface
export interface IAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Service Provider Types
export interface IServiceProvider extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  services: Types.ObjectId[];
  experience: number;
  hourlyRate: number;
  description?: string;
  skills: string[];
  availability: IAvailability;
  rating: number;
  totalReviews: number;
  totalBookings: number;
  completedBookings: number;
  isVerified: boolean;
  verificationDocuments: IVerificationDocument[];
  portfolio: IPortfolioItem[];
  serviceArea: {
    cities: string[];
    maxDistance: number; // in kilometers
  };
  profileViews: number;
  joinedDate: Date;
  lastActiveDate: Date;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateRating(newRating: number): Promise<any>;
  incrementProfileViews(): Promise<any>;
  addPortfolioItem(portfolioItem: IPortfolioItem): Promise<IServiceProvider>;
  updateAvailability(availability: IAvailability): Promise<IServiceProvider>;
}

// Availability Schedule
export interface IAvailability {
  monday: ITimeSlot[];
  tuesday: ITimeSlot[];
  wednesday: ITimeSlot[];
  thursday: ITimeSlot[];
  friday: ITimeSlot[];
  saturday: ITimeSlot[];
  sunday: ITimeSlot[];
}

export interface ITimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  isAvailable: boolean;
}

// Verification Document
export interface IVerificationDocument {
  type: 'identity' | 'address' | 'professional' | 'other';
  documentNumber: string;
  imageUrl: string;
  isVerified: boolean;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  remarks?: string;
}

// Portfolio Item
export interface IPortfolioItem {
  title: string;
  description: string;
  images: string[];
  serviceType: string;
  completedDate: Date;
  clientFeedback?: string;
}

// Service Types
export interface IService extends Document {
  _id: Types.ObjectId;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  longDescription?: string;
  basePrice: number;
  priceUnit: 'fixed' | 'hourly' | 'square_foot' | 'per_item';
  duration: number; // in minutes
  tags: string[];
  requirements: string[];
  images: string[];
  icon?: string;
  isActive: boolean;
  popularity: number;
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  incrementPopularity(): Promise<any>;
  updateRating(newRating: number): Promise<any>;
}

// Booking Types
export interface IBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;
  customer: Types.ObjectId | IUser;
  provider: Types.ObjectId | IServiceProvider;
  service: Types.ObjectId | IService;
  scheduledDate: Date;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  address: IAddress;
  contactPhone: string;
  specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  statusHistory: IStatusChange[];
  pricing: IPricing;
  payment: IPaymentInfo;
  workSummary?: IWorkSummary;
  cancelledBy?: 'customer' | 'provider' | 'admin';
  cancellationReason?: string;
  cancellationDate?: Date;
  refundAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateStatus(newStatus: string, changedBy: string, reason?: string, comments?: string): Promise<IBooking>;
  calculateRefundAmount(): number;
  addWorkSummary(workSummary: Partial<IWorkSummary>): Promise<IBooking>;
  updatePaymentStatus(status: string, transactionId?: string, method?: string, amount?: number): Promise<IBooking>;
}

export interface IStatusChange {
  status: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
  comments?: string;
}

export interface IPricing {
  baseAmount: number;
  additionalCharges: IAdditionalCharge[];
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  taxAmount: number;
  totalAmount: number;
}

export interface IAdditionalCharge {
  name: string;
  amount: number;
  description?: string;
}

export interface IPaymentInfo {
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  method?: 'razorpay' | 'stripe' | 'cash' | 'upi';
  transactionId?: string;
  paidAmount: number;
  paidAt?: Date;
  refundTransactionId?: string;
  refundAmount?: number;
  refundedAt?: Date;
}

export interface IWorkSummary {
  workStartTime?: Date;
  workEndTime?: Date;
  workDescription?: string;
  beforeImages?: string[];
  afterImages?: string[];
  materialsUsed?: string[];
  additionalNotes?: string;
}

// Review Types
export interface IReview extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId | IBooking;
  customer: Types.ObjectId | IUser;
  provider: Types.ObjectId | IServiceProvider;
  service: Types.ObjectId | IService;
  rating: number;
  comment?: string;
  images?: string[];
  aspects: {
    punctuality: number;
    quality: number;
    professionalism: number;
    valueForMoney: number;
  };
  isAnonymous: boolean;
  isReported: boolean;
  reportReason?: string;
  adminResponse?: string;
  helpfulCount: number;
  status?: 'active' | 'hidden' | 'reported';
  reports?: {
    reportedBy: Types.ObjectId;
    reason: string;
    reportedAt: Date;
  }[];
  providerResponse?: {
    response: string;
    respondedAt: Date;
  };
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: 'booking' | 'payment' | 'review' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: any;
  channels: ('push' | 'email' | 'sms')[];
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Types
export interface IChat extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  participants: Types.ObjectId[];
  messages: IMessage[];
  isActive: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  sender: Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'location';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  sentAt: Date;
  readBy: {
    user: Types.ObjectId;
    readAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt?: Date;
}

// Coupon Types
export interface ICoupon extends Document {
  _id: Types.ObjectId;
  code: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableServices?: Types.ObjectId[];
  applicableCategories?: string[];
  validFrom: Date;
  validUntil: Date;
  userRestrictions?: {
    newUsersOnly?: boolean;
    maxUsagePerUser?: number;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface IAnalytics {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  popularServices: {
    service: string;
    count: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  userGrowth: {
    month: string;
    users: number;
  }[];
}

// Request Types
export interface IAuthenticatedRequest extends Request {
  user?: IUser;
  provider?: IServiceProvider;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ISearchQuery extends IPaginationQuery {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

// Response Types
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// JWT Payload
export interface IJWTPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// File Upload Types
export interface IUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ICloudinaryResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

// Email Types
export interface IEmailTemplate {
  to: string;
  subject: string;
  template: string;
  data: any;
}

// SMS Types
export interface ISMSMessage {
  to: string;
  message: string;
}

// Push Notification Types
export interface IPushNotification {
  tokens: string[];
  title: string;
  body: string;
  data?: any;
}

// All types are exported individually above, no default export needed for interfaces
