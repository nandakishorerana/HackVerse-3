import mongoose, { Schema, Model } from 'mongoose';
import { IService } from '@/types';

// Service Schema
const ServiceSchema = new Schema<IService>({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    trim: true,
    enum: {
      values: [
        'cleaning',
        'plumbing',
        'electrical',
        'carpentry',
        'painting',
        'appliance-repair',
        'gardening',
        'vehicle-repair',
        'beauty',
        'tutoring',
        'fitness',
        'other'
      ],
      message: 'Please select a valid service category'
    }
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategory cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [1, 'Base price must be at least ₹1'],
    max: [100000, 'Base price cannot exceed ₹1,00,000']
  },
  priceUnit: {
    type: String,
    required: [true, 'Price unit is required'],
    enum: {
      values: ['fixed', 'hourly', 'square_foot', 'per_item'],
      message: 'Price unit must be fixed, hourly, square_foot, or per_item'
    },
    default: 'fixed'
  },
  duration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [1440, 'Duration cannot exceed 24 hours (1440 minutes)']
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 10;
      },
      message: 'Cannot have more than 10 tags'
    }
  },
  requirements: {
    type: [String],
    default: [],
    validate: {
      validator: function(requirements: string[]) {
        return requirements.length <= 20;
      },
      message: 'Cannot have more than 20 requirements'
    }
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(images: string[]) {
        return images.length <= 5;
      },
      message: 'Cannot have more than 5 images'
    }
  },
  icon: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  popularity: {
    type: Number,
    default: 0,
    min: [0, 'Popularity cannot be negative']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Total reviews cannot be negative']
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
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ isActive: 1 });
ServiceSchema.index({ averageRating: -1 });
ServiceSchema.index({ popularity: -1 });
ServiceSchema.index({ basePrice: 1 });
ServiceSchema.index({ createdAt: -1 });
ServiceSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes
ServiceSchema.index({ category: 1, isActive: 1, averageRating: -1 });
ServiceSchema.index({ isActive: 1, popularity: -1 });

// Static method to get popular services
ServiceSchema.statics.getPopularServices = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ popularity: -1, averageRating: -1 })
    .limit(limit);
};

// Static method to get services by category
ServiceSchema.statics.getServicesByCategory = function(category: string, limit = 20) {
  return this.find({ 
    category: category.toLowerCase(),
    isActive: true 
  })
    .sort({ averageRating: -1, popularity: -1 })
    .limit(limit);
};

// Static method to search services
ServiceSchema.statics.searchServices = function(
  searchQuery: string,
  filters: any = {},
  page = 1,
  limit = 20
) {
  const query: any = {
    isActive: true,
    $text: { $search: searchQuery }
  };

  // Apply filters
  if (filters.category) {
    query.category = filters.category.toLowerCase();
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.basePrice = {};
    if (filters.minPrice) query.basePrice.$gte = filters.minPrice;
    if (filters.maxPrice) query.basePrice.$lte = filters.maxPrice;
  }
  
  if (filters.minRating) {
    query.averageRating = { $gte: filters.minRating };
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ score: { $meta: 'textScore' }, averageRating: -1 })
    .skip(skip)
    .limit(limit);
};

// Instance method to increment popularity
ServiceSchema.methods.incrementPopularity = function() {
  return this.updateOne({ $inc: { popularity: 1 } });
};

// Instance method to update rating
ServiceSchema.methods.updateRating = async function(newRating: number) {
  const totalRating = (this.averageRating * this.totalReviews) + newRating;
  const newTotalReviews = this.totalReviews + 1;
  const newAverageRating = totalRating / newTotalReviews;

  return this.updateOne({
    averageRating: Number(newAverageRating.toFixed(2)),
    totalReviews: newTotalReviews
  });
};

// Pre-save middleware
ServiceSchema.pre('save', function(next) {
  // Ensure tags and requirements are properly formatted
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(Boolean);
  }
  
  if (this.requirements) {
    this.requirements = this.requirements.map(req => req.trim()).filter(Boolean);
  }

  next();
});

// Export the model
const Service: Model<IService> = mongoose.model<IService>('Service', ServiceSchema);
export default Service;
