import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from '@/config/database';
import { redisClient } from '@/config/redis';
import logger from '@/config/logger';
import { errorHandler, notFound } from '@/middleware/error.middleware';
import { specs, swaggerUi, swaggerSetup } from '@/config/swagger.config';

// Import routes
import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import serviceRoutes from '@/routes/service.routes';
import providerRoutes from '@/routes/provider.routes';
import bookingRoutes from '@/routes/booking.routes';
import reviewRoutes from '@/routes/review.routes';
import paymentRoutes from '@/routes/payment.routes';
import adminRoutes from '@/routes/admin.routes';
import notificationRoutes from '@/routes/notification.routes';

// Load environment variables
import './config/env';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiting
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50:
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression()); // Gzip compression
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting and speed limiting
app.use(limiter);
app.use(speedLimiter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerSetup));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/services`, serviceRoutes);
app.use(`/api/${API_VERSION}/providers`, providerRoutes);
app.use(`/api/${API_VERSION}/bookings`, bookingRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);

// Serve static files
app.use('/uploads', express.static('uploads'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room: ${roomId}`);
  });
  
  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    logger.info(`Socket ${socket.id} left room: ${roomId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io available throughout the app
app.set('io', io);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connection
    if (process.env.MONGODB_URI) {
      logger.info('Closing database connection...');
    }
    
    // Close Redis connection
    if (redisClient) {
      redisClient.quit();
      logger.info('Redis connection closed');
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
}

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Connect to Redis (optional)
    try {
      if (process.env.REDIS_URL && redisClient) {
        await redisClient.connect();
        logger.info('Redis connected successfully');
      }
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache');
    }
    
    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`API Documentation available at: http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
