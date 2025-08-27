import { Service } from '@/models';
import { ServiceProvider } from '@/models';
import { User } from '@/models';
import { Booking } from '@/models';
import { Review } from '@/models';
import { Types } from 'mongoose';

interface SearchQuery {
  query?: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    coordinates?: [number, number];
    radius?: number; // in kilometers
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  rating?: number;
  availability?: {
    date?: Date;
    timeSlots?: string[];
  };
  verified?: boolean;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popularity' | 'distance' | 'newest';
  page?: number;
  limit?: number;
}

interface SearchFilters {
  duration?: {
    min?: number;
    max?: number;
  };
  serviceType?: 'individual' | 'team';
  experience?: number;
  certifications?: string[];
  languages?: string[];
}

class SearchService {
  
  // Advanced service search with multiple filters
  async searchServices(searchQuery: SearchQuery, filters?: SearchFilters): Promise<{
    services: any[];
    total: number;
    page: number;
    totalPages: number;
    filters: any;
  }> {
    const page = searchQuery.page || 1;
    const limit = searchQuery.limit || 20;
    const skip = (page - 1) * limit;

    // Build MongoDB aggregation pipeline
    const pipeline: any[] = [];

    // Match stage - basic filtering
    const matchStage: any = { isActive: true };

    // Text search
    if (searchQuery.query) {
      matchStage.$text = { $search: searchQuery.query };
    }

    // Category filter
    if (searchQuery.category) {
      matchStage.category = new RegExp(searchQuery.category, 'i');
    }

    // Price range filter
    if (searchQuery.priceRange) {
      matchStage.price = {};
      if (searchQuery.priceRange.min) {
        matchStage.price.$gte = searchQuery.priceRange.min;
      }
      if (searchQuery.priceRange.max) {
        matchStage.price.$lte = searchQuery.priceRange.max;
      }
    }

    // Rating filter
    if (searchQuery.rating) {
      matchStage['rating.average'] = { $gte: searchQuery.rating };
    }

    // Duration filter
    if (filters?.duration) {
      matchStage.duration = {};
      if (filters.duration.min) {
        matchStage.duration.$gte = filters.duration.min;
      }
      if (filters.duration.max) {
        matchStage.duration.$lte = filters.duration.max;
      }
    }

    pipeline.push({ $match: matchStage });

    // Location-based filtering and distance calculation
    if (searchQuery.location?.coordinates) {
      pipeline.push({
        $lookup: {
          from: 'serviceproviders',
          localField: 'provider',
          foreignField: '_id',
          as: 'providerInfo'
        }
      });

      pipeline.push({
        $addFields: {
          distance: {
            $let: {
              vars: {
                providerLocation: { $arrayElemAt: ['$providerInfo.location.coordinates', 0] }
              },
              in: {
                $sqrt: {
                  $add: [
                    { $pow: [{ $subtract: [{ $arrayElemAt: ['$$providerLocation', 0] }, searchQuery.location.coordinates[0]] }, 2] },
                    { $pow: [{ $subtract: [{ $arrayElemAt: ['$$providerLocation', 1] }, searchQuery.location.coordinates[1]] }, 2] }
                  ]
                }
              }
            }
          }
        }
      });

      // Filter by radius if specified
      if (searchQuery.location.radius) {
        pipeline.push({
          $match: {
            distance: { $lte: searchQuery.location.radius }
          }
        });
      }
    } else if (searchQuery.location?.city) {
      pipeline.push({
        $lookup: {
          from: 'serviceproviders',
          localField: 'provider',
          foreignField: '_id',
          as: 'providerInfo'
        }
      });

      pipeline.push({
        $match: {
          'providerInfo.address.city': new RegExp(searchQuery.location.city, 'i')
        }
      });
    }

    // Provider verification filter
    if (searchQuery.verified) {
      if (!pipeline.find(stage => stage.$lookup && stage.$lookup.from === 'serviceproviders')) {
        pipeline.push({
          $lookup: {
            from: 'serviceproviders',
            localField: 'provider',
            foreignField: '_id',
            as: 'providerInfo'
          }
        });
      }
      
      pipeline.push({
        $match: {
          'providerInfo.isVerified': true
        }
      });
    }

    // Additional filters
    if (filters) {
      if (filters.serviceType) {
        matchStage.serviceType = filters.serviceType;
      }

      if (filters.certifications && filters.certifications.length > 0) {
        pipeline.push({
          $match: {
            'providerInfo.certifications': { $in: filters.certifications }
          }
        });
      }
    }

    // Availability filter
    if (searchQuery.availability?.date) {
      pipeline.push({
        $lookup: {
          from: 'bookings',
          let: { serviceId: '$_id', providerId: '$provider' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$service', '$$serviceId'] },
                    { $eq: ['$provider', '$$providerId'] },
                    { $eq: ['$scheduledDate', searchQuery.availability.date] },
                    { $in: ['$status', ['confirmed', 'in-progress']] }
                  ]
                }
              }
            }
          ],
          as: 'existingBookings'
        }
      });

      pipeline.push({
        $match: {
          existingBookings: { $size: 0 }
        }
      });
    }

    // Sorting
    const sortStage: any = {};
    switch (searchQuery.sortBy) {
      case 'price_low':
        sortStage.price = 1;
        break;
      case 'price_high':
        sortStage.price = -1;
        break;
      case 'rating':
        sortStage['rating.average'] = -1;
        break;
      case 'popularity':
        sortStage.bookingCount = -1;
        break;
      case 'distance':
        if (searchQuery.location?.coordinates) {
          sortStage.distance = 1;
        }
        break;
      case 'newest':
        sortStage.createdAt = -1;
        break;
      case 'relevance':
      default:
        if (searchQuery.query) {
          sortStage.score = { $meta: 'textScore' };
        } else {
          sortStage['rating.average'] = -1;
          sortStage.bookingCount = -1;
        }
        break;
    }

    pipeline.push({ $sort: sortStage });

    // Add pagination
    const totalPipeline = [...pipeline, { $count: 'total' }];
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Populate provider information
    pipeline.push({
      $lookup: {
        from: 'serviceproviders',
        localField: 'provider',
        foreignField: '_id',
        as: 'provider',
        pipeline: [
          {
            $project: {
              name: 1,
              avatar: 1,
              rating: 1,
              isVerified: 1,
              experience: 1,
              address: 1
            }
          }
        ]
      }
    });

    pipeline.push({
      $unwind: '$provider'
    });

    // Execute queries
    const [services, totalResult] = await Promise.all([
      Service.aggregate(pipeline),
      Service.aggregate(totalPipeline)
    ]);

    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Get available filters for frontend
    const availableFilters = await this.getAvailableFilters(searchQuery);

    return {
      services,
      total,
      page,
      totalPages,
      filters: availableFilters
    };
  }

  // Search service providers
  async searchProviders(searchQuery: SearchQuery): Promise<{
    providers: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = searchQuery.page || 1;
    const limit = searchQuery.limit || 20;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [];
    const matchStage: any = { isActive: true };

    // Text search
    if (searchQuery.query) {
      matchStage.$text = { $search: searchQuery.query };
    }

    // Location filter
    if (searchQuery.location?.city) {
      matchStage['address.city'] = new RegExp(searchQuery.location.city, 'i');
    }

    // Rating filter
    if (searchQuery.rating) {
      matchStage['rating.average'] = { $gte: searchQuery.rating };
    }

    // Verification filter
    if (searchQuery.verified) {
      matchStage.isVerified = true;
    }

    pipeline.push({ $match: matchStage });

    // Sorting
    const sortStage: any = {};
    switch (searchQuery.sortBy) {
      case 'rating':
        sortStage['rating.average'] = -1;
        break;
      case 'newest':
        sortStage.createdAt = -1;
        break;
      default:
        sortStage['rating.average'] = -1;
        sortStage.totalBookings = -1;
        break;
    }

    pipeline.push({ $sort: sortStage });

    // Pagination
    const totalPipeline = [...pipeline, { $count: 'total' }];
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Add service count
    pipeline.push({
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: 'provider',
        as: 'services'
      }
    });

    pipeline.push({
      $addFields: {
        serviceCount: { $size: '$services' }
      }
    });

    pipeline.push({
      $project: {
        services: 0,
        password: 0
      }
    });

    const [providers, totalResult] = await Promise.all([
      ServiceProvider.aggregate(pipeline),
      ServiceProvider.aggregate(totalPipeline)
    ]);

    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return { providers, total, page, totalPages };
  }

  // Get personalized recommendations
  async getRecommendations(userId: string, options: {
    type: 'popular' | 'nearby' | 'similar' | 'trending';
    limit?: number;
    location?: { city: string; coordinates?: [number, number] };
  }): Promise<any[]> {
    const limit = options.limit || 10;
    let pipeline: any[] = [];

    switch (options.type) {
      case 'popular':
        pipeline = [
          { $match: { isActive: true } },
          { $sort: { bookingCount: -1, 'rating.average': -1 } },
          { $limit: limit }
        ];
        break;

      case 'nearby':
        if (options.location?.coordinates) {
          pipeline = [
            { $match: { isActive: true } },
            {
              $lookup: {
                from: 'serviceproviders',
                localField: 'provider',
                foreignField: '_id',
                as: 'provider'
              }
            },
            {
              $addFields: {
                distance: {
                  $sqrt: {
                    $add: [
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$provider.location.coordinates', 0] }, options.location.coordinates[0]] }, 2] },
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$provider.location.coordinates', 1] }, options.location.coordinates[1]] }, 2] }
                    ]
                  }
                }
              }
            },
            { $sort: { distance: 1, 'rating.average': -1 } },
            { $limit: limit }
          ];
        } else if (options.location?.city) {
          pipeline = [
            { $match: { isActive: true } },
            {
              $lookup: {
                from: 'serviceproviders',
                localField: 'provider',
                foreignField: '_id',
                as: 'provider'
              }
            },
            {
              $match: {
                'provider.address.city': new RegExp(options.location.city, 'i')
              }
            },
            { $sort: { 'rating.average': -1, bookingCount: -1 } },
            { $limit: limit }
          ];
        }
        break;

      case 'similar':
        // Get user's booking history to find similar services
        const userBookings = await Booking.find({ customer: userId })
          .populate('service')
          .limit(10)
          .sort({ createdAt: -1 });

        const categories = [...new Set(userBookings.map(b => b.service?.category).filter(Boolean))];
        
        pipeline = [
          { $match: { isActive: true, category: { $in: categories } } },
          { $sort: { 'rating.average': -1, bookingCount: -1 } },
          { $limit: limit }
        ];
        break;

      case 'trending':
        // Services with high recent booking activity
        const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const trendingServices = await Booking.aggregate([
          {
            $match: {
              createdAt: { $gte: recentDate },
              status: { $in: ['completed', 'confirmed'] }
            }
          },
          {
            $group: {
              _id: '$service',
              recentBookings: { $sum: 1 }
            }
          },
          { $sort: { recentBookings: -1 } },
          { $limit: limit }
        ]);

        const serviceIds = trendingServices.map(t => t._id);
        
        pipeline = [
          { $match: { _id: { $in: serviceIds }, isActive: true } },
          {
            $addFields: {
              trendingScore: {
                $indexOfArray: [serviceIds, '$_id']
              }
            }
          },
          { $sort: { trendingScore: 1 } }
        ];
        break;
    }

    // Add provider information
    pipeline.push({
      $lookup: {
        from: 'serviceproviders',
        localField: 'provider',
        foreignField: '_id',
        as: 'provider',
        pipeline: [
          {
            $project: {
              name: 1,
              avatar: 1,
              rating: 1,
              isVerified: 1
            }
          }
        ]
      }
    });

    pipeline.push({ $unwind: '$provider' });

    return await Service.aggregate(pipeline);
  }

  // Get available filters for current search
  async getAvailableFilters(searchQuery: SearchQuery): Promise<{
    categories: string[];
    priceRanges: { min: number; max: number }[];
    locations: { city: string; count: number }[];
    ratings: number[];
  }> {
    const baseMatch = { isActive: true };

    // Add existing filters to base match
    if (searchQuery.category) {
      baseMatch['category'] = new RegExp(searchQuery.category, 'i');
    }

    const [categories, priceStats, locations, ratings] = await Promise.all([
      // Available categories
      Service.distinct('category', baseMatch),

      // Price statistics
      Service.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgPrice: { $avg: '$price' }
          }
        }
      ]),

      // Available locations
      Service.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: 'serviceproviders',
            localField: 'provider',
            foreignField: '_id',
            as: 'provider'
          }
        },
        { $unwind: '$provider' },
        {
          $group: {
            _id: '$provider.address.city',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),

      // Available ratings
      Service.distinct('rating.average', baseMatch)
    ]);

    const priceRanges = [];
    if (priceStats[0]) {
      const { minPrice, maxPrice } = priceStats[0];
      const range = maxPrice - minPrice;
      const step = Math.ceil(range / 5);
      
      for (let i = 0; i < 5; i++) {
        priceRanges.push({
          min: minPrice + (i * step),
          max: Math.min(minPrice + ((i + 1) * step), maxPrice)
        });
      }
    }

    return {
      categories: categories.filter(Boolean),
      priceRanges,
      locations: locations.map(l => ({ city: l._id, count: l.count })),
      ratings: ratings.filter(r => r && r > 0).sort((a, b) => b - a)
    };
  }

  // Auto-complete search suggestions
  async getSearchSuggestions(query: string, limit = 10): Promise<{
    services: string[];
    categories: string[];
    providers: string[];
  }> {
    const searchRegex = new RegExp(query, 'i');

    const [serviceNames, categories, providerNames] = await Promise.all([
      Service.find({ 
        name: searchRegex, 
        isActive: true 
      }).distinct('name').limit(limit),

      Service.find({ 
        category: searchRegex, 
        isActive: true 
      }).distinct('category').limit(5),

      ServiceProvider.find({ 
        name: searchRegex, 
        isActive: true 
      }).distinct('name').limit(5)
    ]);

    return {
      services: serviceNames.slice(0, limit),
      categories: categories.slice(0, 5),
      providers: providerNames.slice(0, 5)
    };
  }

  // Search analytics
  async trackSearch(userId: string | null, query: string, filters: any, results: number): Promise<void> {
    // In a real implementation, you would save this to a search analytics collection
    console.log('Search tracked:', {
      userId,
      query,
      filters,
      results,
      timestamp: new Date()
    });
  }

  // Get popular search terms
  async getPopularSearches(limit = 10): Promise<string[]> {
    // In a real implementation, this would come from search analytics
    return [
      'home cleaning',
      'plumber',
      'electrician',
      'ac repair',
      'painter',
      'carpenter',
      'appliance repair',
      'pest control',
      'salon at home',
      'massage'
    ].slice(0, limit);
  }
}

export { SearchService };
export default new SearchService();
