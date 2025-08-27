import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUser } from '@/types';
import { config } from '@/config/env';

// Address Schema
const AddressSchema = new Schema({
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

// User Schema
const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['customer', 'provider', 'admin'],
      message: 'Role must be either customer, provider, or admin'
    },
    default: 'customer'
  },
  avatar: {
    type: String,
    default: null
  },
  address: {
    type: AddressSchema,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  phoneVerificationToken: {
    type: String,
    select: false
  },
  phoneVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.phoneVerificationToken;
      delete ret.phoneVerificationExpires;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Constants for account locking
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Virtual for account locking
UserSchema.virtual('isLocked').get(function(this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
UserSchema.methods.generateAuthToken = function(): string {
  const payload = {
    userId: this._id.toString(),
    role: this.role,
    email: this.email
  };

  return jwt.sign(payload, config.jwt.secret as string, {
    expiresIn: config.jwt.expiresIn as string
  } as jwt.SignOptions);
};

// Instance method to generate refresh token
UserSchema.methods.generateRefreshToken = function(): string {
  const payload = {
    userId: this._id.toString(),
    type: 'refresh'
  };

  return jwt.sign(payload, config.jwt.refreshSecret as string, {
    expiresIn: config.jwt.refreshExpiresIn as string
  } as jwt.SignOptions);
};

// Instance method to check if account is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Instance method to increment login attempts
UserSchema.methods.incLoginAttempts = function(): Promise<IUser> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // Lock the account if we've reached max attempts and it's not locked already
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = {
      lockUntil: Date.now() + LOCK_TIME
    };
  }

  return this.updateOne(updates);
};

// Static method to find user by credentials
UserSchema.statics.findByCredentials = async function(email: string, password: string) {
  const user = await this.findOne({ 
    email: email.toLowerCase(),
    isActive: true
  }).select('+password');

  if (!user) {
    throw new Error('Invalid login credentials');
  }

  // Check if account is locked
  if (user.isLocked()) {
    // Increment attempts to reset lock if it has expired
    await user.incLoginAttempts();
    throw new Error('Account is temporarily locked due to too many failed login attempts. Please try again later.');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    throw new Error('Invalid login credentials');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return user;
};

// Instance method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time to 10 minutes
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

// Instance method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire time to 24 hours
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return verificationToken;
};

// Instance method to generate phone verification token (6-digit OTP)
UserSchema.methods.generatePhoneVerificationToken = function(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.phoneVerificationToken = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire time to 10 minutes
  this.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

  return otp;
};

// Export the model
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
