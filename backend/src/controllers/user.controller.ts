import { Request, Response } from 'express';
import { User } from '@/models';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/utils/catchAsync';
import { APIFeatures } from '@/utils/APIFeatures';
import { emailService } from '@/services/email.service';

interface AuthRequest extends Request {
  user?: any;
}

// Get current user profile
export const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update current user profile
export const updateMe = catchAsync(async (req: AuthRequest, res: Response) => {
  // Remove sensitive fields that shouldn't be updated via this route
  const { password, email, role, isVerified, ...updateData } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update user preferences
export const updatePreferences = catchAsync(async (req: AuthRequest, res: Response) => {
  const { preferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { preferences },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: user.preferences
  });
});

// Add address
export const addAddress = catchAsync(async (req: AuthRequest, res: Response) => {
  const addressData = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.addresses?.push(addressData);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address added successfully',
    data: user.addresses
  });
});

// Update address
export const updateAddress = catchAsync(async (req: AuthRequest, res: Response) => {
  const { addressId } = req.params;
  const updateData = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const address = user.addresses?.id(addressId);
  if (!address) {
    throw new AppError('Address not found', 404);
  }

  Object.assign(address, updateData);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: user.addresses
  });
});

// Delete address
export const deleteAddress = catchAsync(async (req: AuthRequest, res: Response) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.addresses?.pull(addressId);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
    data: user.addresses
  });
});

// Deactivate account
export const deactivateAccount = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { 
      isActive: false,
      deactivatedAt: new Date()
    },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Send account deactivation email
  await emailService.sendAccountDeactivationEmail(user.email, user.name);

  res.status(200).json({
    success: true,
    message: 'Account deactivated successfully'
  });
});

// Reactivate account
export const reactivateAccount = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { 
      isActive: true,
      $unset: { deactivatedAt: 1 }
    },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Send welcome back email
  await emailService.sendWelcomeEmail(user.email, user.name);

  res.status(200).json({
    success: true,
    message: 'Account reactivated successfully',
    data: user
  });
});

// Get user activity/stats
export const getUserStats = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  // This would typically aggregate from multiple collections
  // For now, returning basic user info
  const user = await User.findById(userId).select('createdAt lastLogin loginCount');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const stats = {
    memberSince: user.createdAt,
    lastLogin: user.lastLogin,
    totalLogins: user.loginCount || 0,
    // These would come from other collections
    totalBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    favoriteServices: []
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

// ADMIN ROUTES

// Get all users (admin only)
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const features = new APIFeatures(User.find().select('-password'), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;
  const total = await User.countDocuments();

  res.status(200).json({
    success: true,
    results: users.length,
    total,
    data: users
  });
});

// Get user by ID (admin only)
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Update user (admin only)
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Don't allow password updates through this route
  delete updateData.password;

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  }).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// Delete user (admin only)
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Soft delete
  await User.findByIdAndUpdate(id, { 
    isActive: false, 
    deletedAt: new Date() 
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get user statistics (admin only)
export const getUserStatistics = catchAsync(async (req: Request, res: Response) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        verifiedUsers: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
        customers: { $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] } },
        providers: { $sum: { $cond: [{ $eq: ['$role', 'provider'] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
      }
    }
  ]);

  const monthlySignups = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        customers: 0,
        providers: 0,
        admins: 0
      },
      monthlySignups
    }
  });
});

// Block/unblock user (admin only)
export const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive, reason } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = isActive;
  if (reason) {
    user.statusReason = reason;
  }

  await user.save();

  // Send notification email
  const action = isActive ? 'activated' : 'blocked';
  await emailService.sendAccountStatusEmail(user.email, user.name, action, reason);

  res.status(200).json({
    success: true,
    message: `User ${action} successfully`,
    data: {
      id: user._id,
      isActive: user.isActive,
      statusReason: user.statusReason
    }
  });
});
