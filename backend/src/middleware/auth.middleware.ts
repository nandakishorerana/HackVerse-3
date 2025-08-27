import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '@/models/User.model';
import { AppError, catchAsync } from './error.middleware';
import { IAuthenticatedRequest, IJWTPayload, IUser } from '@/types';
import { config } from '@/config/env';
import logger from '@/config/logger';

// Extend Request interface with user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Middleware to protect routes - requires valid JWT token
 */
export const protect = catchAsync(async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 1) Getting token and check if it exists
  let token: string | undefined;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    // 2) Verify token
    const verify = promisify(jwt.verify) as any;
    const decoded = await verify(token, config.jwt.secret) as IJWTPayload;

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.userId).select('+isActive');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // 5) Check if user account is locked
    if (currentUser.isLocked()) {
      return next(new AppError('Your account is temporarily locked. Please try again later.', 401));
    }

    // 6) Grant access to protected route
    req.user = currentUser;
    next();

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again!', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    
    logger.error('JWT verification error:', error);
    return next(new AppError('Authentication failed. Please log in again.', 401));
  }
});

/**
 * Middleware to restrict access to specific roles
 */
export const restrictTo = (...roles: string[]) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Middleware for optional authentication
 * Attaches user to request if valid token is provided, but doesn't fail if no token
 */
export const optionalAuth = catchAsync(async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const verify = promisify(jwt.verify) as any;
      const decoded = await verify(token, config.jwt.secret) as IJWTPayload;

      const currentUser = await User.findById(decoded.userId).select('+isActive');
      if (currentUser && currentUser.isActive && !currentUser.isLocked()) {
        req.user = currentUser;
      }
    } catch (error) {
      // Token invalid but we don't fail the request
      logger.debug('Optional auth failed:', error);
    }
  }

  next();
});

/**
 * Middleware to check if user owns the resource or is admin
 */
export const checkOwnership = (resourceUserField: string = 'user') => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[resourceUserField] || req.params[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only access your own resources', 403));
    }

    next();
  };
};

/**
 * Middleware to validate API key (for webhook endpoints)
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return next(new AppError('API key is required', 401));
  }

  // In production, you should validate against a list of valid API keys
  // For now, we'll use a simple check
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey as string)) {
    return next(new AppError('Invalid API key', 401));
  }

  next();
};

/**
 * Middleware to rate limit by user
 */
export const userRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request history
    let userRequestHistory = userRequests.get(userId) || [];
    
    // Filter out requests outside the current window
    userRequestHistory = userRequestHistory.filter((requestTime: number) => requestTime > windowStart);

    // Check if user has exceeded the limit
    if (userRequestHistory.length >= maxRequests) {
      return next(new AppError('Too many requests from this user. Please try again later.', 429));
    }

    // Add current request
    userRequestHistory.push(now);
    userRequests.set(userId, userRequestHistory);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, requests] of userRequests.entries()) {
        const filteredRequests = requests.filter((requestTime: number) => requestTime > windowStart);
        if (filteredRequests.length === 0) {
          userRequests.delete(key);
        } else {
          userRequests.set(key, filteredRequests);
        }
      }
    }

    next();
  };
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerification = (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!req.user.isEmailVerified) {
    return next(new AppError('Please verify your email address to access this resource', 403));
  }

  next();
};

/**
 * Middleware to check if phone is verified
 */
export const requirePhoneVerification = (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!req.user.isPhoneVerified) {
    return next(new AppError('Please verify your phone number to access this resource', 403));
  }

  next();
};

export default {
  protect,
  restrictTo,
  optionalAuth,
  checkOwnership,
  validateApiKey,
  userRateLimit,
  requireEmailVerification,
  requirePhoneVerification
};
