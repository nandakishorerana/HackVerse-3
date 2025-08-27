import { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';
import { IApiResponse } from '@/types';

// Custom Error Class
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Cast Error Handler (Invalid MongoDB ObjectId)
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Duplicate Fields Error Handler
const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Validation Error Handler
const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// JWT Error Handlers
const handleJWTError = (): AppError =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = (): AppError =>
  new AppError('Your token has expired! Please log in again.', 401);

// Development Error Response
const sendErrorDev = (err: AppError, res: Response): void => {
  const response: IApiResponse = {
    success: false,
    message: err.message,
    data: {
      status: err.status,
      error: err,
      stack: err.stack
    }
  };

  res.status(err.statusCode).json(response);
};

// Production Error Response
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: IApiResponse = {
      success: false,
      message: err.message
    };

    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);

    const response: IApiResponse = {
      success: false,
      message: 'Something went wrong!'
    };

    res.status(500).json(response);
  }
};

// Main Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle different types of errors
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// 404 Handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Can't find ${req.originalUrl} on this server!`;
  next(new AppError(message, 404));
};

// Async Error Handler Wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

// Success Response Helper
export const successResponse = (
  res: Response,
  message: string,
  data?: any,
  statusCode: number = 200,
  pagination?: any
): Response => {
  const response: IApiResponse = {
    success: true,
    message,
    data,
    ...(pagination && { pagination })
  };

  return res.status(statusCode).json(response);
};

// Error Response Helper
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any[]
): Response => {
  const response: IApiResponse = {
    success: false,
    message,
    ...(errors && { errors })
  };

  return res.status(statusCode).json(response);
};

export default {
  AppError,
  errorHandler,
  notFound,
  catchAsync,
  successResponse,
  errorResponse
};
