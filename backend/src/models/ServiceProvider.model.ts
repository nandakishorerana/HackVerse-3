import mongoose, { Schema, Model } from 'mongoose';
import { IServiceProvider, IAvailability, ITimeSlot, IVerificationDocument, IPortfolioItem } from '@/types';

// TimeSlot Schema
const TimeSlotSchema = new Schema<ITimeSlot>({
  start: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:mm format']
  },
  end: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:mm format']
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Availability Schema
const AvailabilitySchema = new Schema<IAvailability>({
  monday: [TimeSlotSchema],
  tuesday: [TimeSlotSchema],
  wednesday: [TimeSlotSchema],
  thursday: [TimeSlotSchema],
  friday: [TimeSlotSchema],
  saturday: [TimeSlotSchema],
  sunday: [TimeSlotSchema]
}, { _id: false });

// Verification Document Schema
const VerificationDocumentSchema = new Schema<IVerificationDocument>({
  type: {
    type: String,
    required: [true, 'Document type is required'],
    enum: {
      values: ['identity', 'address', 'professional', 'other'],
      message: 'Document type must be identity, address, professional, or other'
    }
  },
  documentNumber: {
    type: String,
    required: [true, 'Document number is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Document image is required']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  }
}, { _id: false, timestamps: true });

// Portfolio Item Schema
const PortfolioItemSchema = new Schema<IPortfolioItem>({
  title: {
    type: String,
    required: [true, 'Portfolio title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Portfolio description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  images: {
    type: [String],
    validate: {
      validator: function(images: string[]) {
        return images.length <= 10 && images.length > 0;
      },
      message: 'Portfolio must have 1-10 images'
    }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    trim: true
  },
  completedDate: {
    type: Date,
    required: [true, 'Completion date is required']
  },
  clientFeedback: {
    type: String,
    trim: true,
    maxlength: [300, 'Client feedback cannot exceed 300 characters']
  }
}, { _id: false, timestamps: true });

// ServiceProvider Schema
const ServiceProviderSchema = new Schema<IServiceProvider>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  services: [{
    type: Schema.Types.ObjectId,
    ref: 'Service'
  }],
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [50, 'Hourly rate must be at least ₹50'],
    max: [10000, 'Hourly rate cannot exceed ₹10,000']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  skills: {
    type: [String],
    validate: {
      validator: function(skills: string[]) {
        return skills.length <= 20;
      },
      message: 'Cannot have more than 20 skills'
    }
  },
  availability: {
    type: AvailabilitySchema,
    default: () => ({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    })
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Total reviews cannot be negative']
  },
  totalBookings: {
    type: Number,
    default: 0,
    min: [0, 'Total bookings cannot be negative']
  },
  completedBookings: {
    type: Number,
    default: 0,
    min: [0, 'Completed bookings cannot be negative']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [VerificationDocumentSchema],
  portfolio: {
    type: [PortfolioItemSchema],
    validate: {
      validator: function(portfolio: IPortfolioItem[]) {
        return portfolio.length <= 20;
      },
      message: 'Cannot have more than 20 portfolio items'
    }
  },
  serviceArea: {
    cities: {
      type: [String],
      validate: {
        validator: function(cities: string[]) {
          return cities.length > 0 && cities.length <= 50;
        },
        message: 'Must specify 1-50 service cities'
      }
    },
    maxDistance: {
      type: Number,
      default: 25,
      min: [1, 'Service distance must be at least 1 km'],
      max: [200, 'Service distance cannot exceed 200 km']
    }
  },
  profileViews: {
    type: Number,
    default: 0,
    min: [0, 'Profile views cannot be negative']
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  lastActiveDate: {
    type: Date,
    default: Date.now
  },
  isAvailable: {
    type: Boolean,
    default: true
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
ServiceProviderSchema.index({ user: 1 });
ServiceProviderSchema.index({ 'serviceArea.cities': 1 });
ServiceProviderSchema.index({ rating: -1 });
ServiceProviderSchema.index({ totalReviews: -1 });
ServiceProviderSchema.index({ isVerified: 1, isAvailable: 1 });
ServiceProviderSchema.index({ services: 1 });
ServiceProviderSchema.index({ hourlyRate: 1 });
ServiceProviderSchema.index({ experience: -1 });
ServiceProviderSchema.index({ createdAt: -1 });

// Compound indexes
ServiceProviderSchema.index({ 
  isVerified: 1, 
  isAvailable: 1, 
  rating: -1, 
  totalReviews: -1 
});

ServiceProviderSchema.index({ 
  'serviceArea.cities': 1, 
  services: 1, 
  isAvailable: 1 
});

// Virtual for completion rate
ServiceProviderSchema.virtual('completionRate').get(function(this: IServiceProvider) {
  if (this.totalBookings === 0) return 0;
  return Number(((this.completedBookings / this.totalBookings) * 100).toFixed(2));
});

// Virtual for response time (mock data, can be calculated from actual data)
ServiceProviderSchema.virtual('averageResponseTime').get(function(this: IServiceProvider) {
  // This would be calculated from actual message/booking response data
  return 30; // minutes
});

// Static method to find providers by service and location
ServiceProviderSchema.statics.findByServiceAndLocation = function(
  serviceId: string,
  city: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  
  return this.find({
    services: serviceId,
    'serviceArea.cities': { $regex: new RegExp(city, 'i') },
    isVerified: true,
    isAvailable: true
  })
    .populate('user', 'name avatar phone')
    .populate('services', 'name category basePrice')
    .sort({ rating: -1, totalReviews: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get top providers
ServiceProviderSchema.statics.getTopProviders = function(limit = 10) {
  return this.find({
    isVerified: true,
    isAvailable: true,
    totalReviews: { $gte: 5 }
  })
    .populate('user', 'name avatar')
    .populate('services', 'name category')
    .sort({ rating: -1, totalReviews: -1 })
    .limit(limit);
};

// Instance method to update rating
ServiceProviderSchema.methods.updateRating = async function(newRating: number) {
  const totalRating = (this.rating * this.totalReviews) + newRating;
  const newTotalReviews = this.totalReviews + 1;
  const newAverageRating = totalRating / newTotalReviews;

  return this.updateOne({
    rating: Number(newAverageRating.toFixed(2)),
    totalReviews: newTotalReviews
  });
};

// Instance method to increment profile views
ServiceProviderSchema.methods.incrementProfileViews = function() {
  return this.updateOne({ $inc: { profileViews: 1 } });
};

// Instance method to add portfolio item
ServiceProviderSchema.methods.addPortfolioItem = function(portfolioItem: IPortfolioItem) {
  if (this.portfolio.length >= 20) {
    throw new Error('Cannot add more than 20 portfolio items');
  }
  
  this.portfolio.push(portfolioItem);
  return this.save();
};

// Instance method to update availability
ServiceProviderSchema.methods.updateAvailability = function(availability: IAvailability) {
  this.availability = availability;
  return this.save();
};

// Pre-save middleware
ServiceProviderSchema.pre('save', function(next) {
  // Update last active date
  this.lastActiveDate = new Date();
  
  // Ensure skills are properly formatted
  if (this.skills) {
    this.skills = this.skills.map(skill => skill.trim().toLowerCase()).filter(Boolean);
  }
  
  // Ensure service area cities are properly formatted
  if (this.serviceArea && this.serviceArea.cities) {
    this.serviceArea.cities = this.serviceArea.cities.map(city => 
      city.trim().toLowerCase()
    ).filter(Boolean);
  }

  next();
});

// Export the model
const ServiceProvider: Model<IServiceProvider> = mongoose.model<IServiceProvider>('ServiceProvider', ServiceProviderSchema);
export default ServiceProvider;
