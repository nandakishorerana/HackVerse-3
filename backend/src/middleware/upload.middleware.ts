import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import { AppError } from '@/utils/AppError';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// File type validation
const allowedFileTypes = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
};

// Create multer file filter
const createFileFilter = (allowedTypes: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
    }
  };
};

// Cloudinary storage configuration for different upload types
const createCloudinaryStorage = (folder: string, allowedFormats: string[]) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `deshi-sahayak/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' }
      ]
    } as any
  });
};

// Avatar upload configuration
const avatarStorage = createCloudinaryStorage('avatars', ['jpg', 'jpeg', 'png', 'webp']);
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: createFileFilter(allowedFileTypes.images),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('avatar');

// Service images upload configuration
const serviceImageStorage = createCloudinaryStorage('services', ['jpg', 'jpeg', 'png', 'webp']);
export const uploadServiceImages = multer({
  storage: serviceImageStorage,
  fileFilter: createFileFilter(allowedFileTypes.images),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 images
  }
}).array('images', 5);

// Review images upload configuration
const reviewImageStorage = createCloudinaryStorage('reviews', ['jpg', 'jpeg', 'png', 'webp']);
export const uploadReviewImages = multer({
  storage: reviewImageStorage,
  fileFilter: createFileFilter(allowedFileTypes.images),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3 // Maximum 3 images
  }
}).array('images', 3);

// Provider documents upload configuration
const documentStorage = createCloudinaryStorage('documents', ['jpg', 'jpeg', 'png', 'pdf']);
export const uploadProviderDocuments = multer({
  storage: documentStorage,
  fileFilter: createFileFilter([...allowedFileTypes.images, ...allowedFileTypes.documents]),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 documents
  }
}).fields([
  { name: 'idProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'certificates', maxCount: 3 }
]);

// Generic file upload configuration
const genericStorage = createCloudinaryStorage('misc', ['jpg', 'jpeg', 'png', 'webp', 'pdf']);
export const uploadFiles = multer({
  storage: genericStorage,
  fileFilter: createFileFilter(allowedFileTypes.all),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per file
    files: 10 // Maximum 10 files
  }
}).array('files', 10);

// Memory storage for processing before upload (if needed)
export const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: createFileFilter(allowedFileTypes.images),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  }
}).array('files', 5);

// Middleware to handle upload errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files', 400));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400));
    }
  }
  next(error);
};

// Utility function to delete files from Cloudinary
export const deleteCloudinaryFile = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

// Utility function to get file URL from Cloudinary
export const getCloudinaryUrl = (publicId: string, transformation?: any): string => {
  return cloudinary.url(publicId, transformation);
};

// Helper function to extract public ID from Cloudinary URL
export const extractPublicId = (cloudinaryUrl: string): string => {
  const matches = cloudinaryUrl.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : '';
};

// Middleware wrapper for different upload types
export const uploadMiddleware = {
  avatar: uploadAvatar,
  serviceImages: uploadServiceImages,
  reviewImages: uploadReviewImages,
  documents: uploadProviderDocuments,
  files: uploadFiles,
  memory: uploadToMemory
};
