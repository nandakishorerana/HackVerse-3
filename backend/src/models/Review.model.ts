import mongoose, { Schema, Model } from 'mongoose';
import { IReview } from '@/types';

// Aspects Schema for detailed ratings
const AspectsSchema = new Schema({
  punctuality: {
    type: Number,
    required: [true, 'Punctuality rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  },
  quality: {
    type: Number,
    required: [true, 'Quality rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  },
  professionalism: {
    type: Number,
    required: [true, 'Professionalism rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  },
  valueForMoney: {
    type: Number,
    required: [true, 'Value for money rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  }
}, { _id: false });

// Review Schema
const ReviewSchema = new Schema<IReview>({
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required'],
    unique: true // One review per booking
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer reference is required']
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: [true, 'Provider reference is required']
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    minlength: [10, 'Comment must be at least 10 characters long']
  },
  images: {
    type: [String],
    validate: {
      validator: function(images: string[]) {
        return images.length <= 5;
      },
      message: 'Cannot upload more than 5 images'
    }
  },
  aspects: {
    type: AspectsSchema,
    required: [true, 'Detailed ratings are required']
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Report reason cannot exceed 200 characters']
  },
  adminResponse: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin response cannot exceed 500 characters']
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: [0, 'Helpful count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      
      // Hide customer info if anonymous
      if (ret.isAnonymous && ret.customer) {
        ret.customer = {
          id: ret.customer.id || ret.customer._id,
          name: 'Anonymous',
          avatar: null
        };
      }
      
      return ret;
    }
  }
});

// Indexes for better query performance
ReviewSchema.index({ booking: 1 });
ReviewSchema.index({ customer: 1 });
ReviewSchema.index({ provider: 1 });
ReviewSchema.index({ service: 1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ isReported: 1 });
ReviewSchema.index({ helpfulCount: -1 });

// Compound indexes
ReviewSchema.index({ provider: 1, rating: -1, createdAt: -1 });
ReviewSchema.index({ service: 1, rating: -1, createdAt: -1 });
ReviewSchema.index({ isReported: 1, createdAt: -1 });

// Virtual for average aspect rating
ReviewSchema.virtual('averageAspectRating').get(function(this: IReview) {
  if (!this.aspects) return 0;
  
  const total = this.aspects.punctuality + 
                this.aspects.quality + 
                this.aspects.professionalism + 
                this.aspects.valueForMoney;
  
  return Number((total / 4).toFixed(2));
});

// Virtual for review age in days
ReviewSchema.virtual('reviewAge').get(function(this: IReview) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to get reviews by provider
ReviewSchema.statics.getByProvider = function(
  providerId: string,
  page = 1,
  limit = 20,
  rating?: number
) {
  const skip = (page - 1) * limit;
  const query: any = { 
    provider: providerId,
    isReported: false
  };
  
  if (rating) {
    query.rating = rating;
  }
  
  return this.find(query)
    .populate('customer', 'name avatar')
    .populate('service', 'name category')
    .populate('booking', 'bookingNumber scheduledDate')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get reviews by service
ReviewSchema.statics.getByService = function(
  serviceId: string,
  page = 1,
  limit = 20,
  rating?: number
) {
  const skip = (page - 1) * limit;
  const query: any = { 
    service: serviceId,
    isReported: false
  };
  
  if (rating) {
    query.rating = rating;
  }
  
  return this.find(query)
    .populate('customer', 'name avatar')
    .populate('provider', 'user', { 
      populate: { path: 'user', select: 'name' }
    })
    .populate('booking', 'bookingNumber scheduledDate')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get recent reviews
ReviewSchema.statics.getRecentReviews = function(limit = 10) {
  return this.find({ isReported: false })
    .populate('customer', 'name avatar')
    .populate('provider', 'user', { 
      populate: { path: 'user', select: 'name' }
    })
    .populate('service', 'name category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get top-rated reviews
ReviewSchema.statics.getTopRated = function(limit = 10) {
  return this.find({ 
    isReported: false,
    rating: { $gte: 4 },
    comment: { $exists: true, $ne: '' }
  })
    .populate('customer', 'name avatar')
    .populate('provider', 'user', { 
      populate: { path: 'user', select: 'name' }
    })
    .populate('service', 'name category')
    .sort({ rating: -1, helpfulCount: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get provider rating statistics
ReviewSchema.statics.getProviderStats = async function(providerId: string) {
  const stats = await this.aggregate([
    { $match: { provider: new mongoose.Types.ObjectId(providerId), isReported: false } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        averagePunctuality: { $avg: '$aspects.punctuality' },
        averageQuality: { $avg: '$aspects.quality' },
        averageProfessionalism: { $avg: '$aspects.professionalism' },
        averageValueForMoney: { $avg: '$aspects.valueForMoney' },
        fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      averagePunctuality: 0,
      averageQuality: 0,
      averageProfessionalism: 0,
      averageValueForMoney: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
  
  const stat = stats[0];
  return {
    totalReviews: stat.totalReviews,
    averageRating: Number((stat.averageRating || 0).toFixed(2)),
    averagePunctuality: Number((stat.averagePunctuality || 0).toFixed(2)),
    averageQuality: Number((stat.averageQuality || 0).toFixed(2)),
    averageProfessionalism: Number((stat.averageProfessionalism || 0).toFixed(2)),
    averageValueForMoney: Number((stat.averageValueForMoney || 0).toFixed(2)),
    ratingDistribution: {
      5: stat.fiveStars,
      4: stat.fourStars,
      3: stat.threeStars,
      2: stat.twoStars,
      1: stat.oneStar
    }
  };
};

// Static method to get service rating statistics
ReviewSchema.statics.getServiceStats = async function(serviceId: string) {
  const stats = await this.aggregate([
    { $match: { service: new mongoose.Types.ObjectId(serviceId), isReported: false } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        averagePunctuality: { $avg: '$aspects.punctuality' },
        averageQuality: { $avg: '$aspects.quality' },
        averageProfessionalism: { $avg: '$aspects.professionalism' },
        averageValueForMoney: { $avg: '$aspects.valueForMoney' }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      averagePunctuality: 0,
      averageQuality: 0,
      averageProfessionalism: 0,
      averageValueForMoney: 0
    };
  }
  
  const stat = stats[0];
  return {
    totalReviews: stat.totalReviews,
    averageRating: Number((stat.averageRating || 0).toFixed(2)),
    averagePunctuality: Number((stat.averagePunctuality || 0).toFixed(2)),
    averageQuality: Number((stat.averageQuality || 0).toFixed(2)),
    averageProfessionalism: Number((stat.averageProfessionalism || 0).toFixed(2)),
    averageValueForMoney: Number((stat.averageValueForMoney || 0).toFixed(2))
  };
};

// Static method to get reported reviews
ReviewSchema.statics.getReportedReviews = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ isReported: true })
    .populate('customer', 'name email phone')
    .populate('provider', 'user', { 
      populate: { path: 'user', select: 'name email phone' }
    })
    .populate('service', 'name category')
    .populate('booking', 'bookingNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Instance method to mark as helpful
ReviewSchema.methods.markAsHelpful = function() {
  return this.updateOne({ $inc: { helpfulCount: 1 } });
};

// Instance method to report review
ReviewSchema.methods.reportReview = function(reason: string) {
  this.isReported = true;
  this.reportReason = reason;
  return this.save();
};

// Instance method to add admin response
ReviewSchema.methods.addAdminResponse = function(response: string) {
  this.adminResponse = response;
  return this.save();
};

// Instance method to unreport review
ReviewSchema.methods.unreportReview = function() {
  this.isReported = false;
  this.reportReason = undefined;
  return this.save();
};

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
  // Ensure comment is provided for ratings below 4
  if (this.rating < 4 && (!this.comment || this.comment.trim().length < 10)) {
    return next(new Error('Comment is required for ratings below 4 stars and must be at least 10 characters long'));
  }
  
  // Calculate overall rating from aspects if not provided
  if (!this.rating && this.aspects) {
    const total = this.aspects.punctuality + 
                  this.aspects.quality + 
                  this.aspects.professionalism + 
                  this.aspects.valueForMoney;
    this.rating = Math.round(total / 4);
  }
  
  next();
});

// Post-save middleware to update provider and service ratings
ReviewSchema.post('save', async function(review) {
  try {
    // Update provider rating
    const ServiceProvider = mongoose.model('ServiceProvider');
    const provider = await ServiceProvider.findById(review.provider);
    if (provider) {
      await provider.updateRating(review.rating);
    }
    
    // Update service rating
    const Service = mongoose.model('Service');
    const service = await Service.findById(review.service);
    if (service) {
      await service.updateRating(review.rating);
    }
  } catch (error) {
    console.error('Error updating ratings after review save:', error);
  }
});

// Post-remove middleware to update provider and service ratings
ReviewSchema.post('deleteOne', async function(review) {
  try {
    // This would require recalculating ratings, which is complex
    // For now, we'll just log that a review was removed
    console.log(`Review was removed, ratings may need recalculation`);
  } catch (error) {
    console.error('Error handling review removal:', error);
  }
});

// Export the model
const Review: Model<IReview> = mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
