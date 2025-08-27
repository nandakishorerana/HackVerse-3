# Deshi Sahayak Hub - Backend API

A comprehensive backend API for the Deshi Sahayak Hub platform - a local home services marketplace for tier-2 and tier-3 cities in India.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role management
- **User Management**: Customer, service provider, and admin roles
- **Service Catalog**: Comprehensive service management system
- **Booking System**: End-to-end booking workflow with real-time updates
- **Payment Integration**: Razorpay (primary) and Stripe support
- **Review System**: Customer reviews and provider ratings
- **Notification System**: Email, SMS, and push notifications
- **File Upload**: Cloudinary integration for image storage
- **Real-time Communication**: Socket.IO for live updates
- **Admin Dashboard**: Complete admin panel APIs
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Rate limiting, input validation, and security headers
- **Caching**: Redis integration for performance
- **Logging**: Winston-based logging system

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Authentication**: JSON Web Tokens (JWT)
- **Validation**: Express Validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **File Upload**: Multer + Cloudinary
- **Real-time**: Socket.IO
- **Email**: Nodemailer
- **SMS**: Twilio
- **Payment**: Razorpay, Stripe
- **Logging**: Winston

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud)
- Redis (optional, for caching)

## 🔧 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd deshi-sahayak-hub-main/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in the environment variables in `.env`:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   API_VERSION=v1

   # Database
   MONGODB_URI=mongodb://localhost:27017/deshi-sahayak-hub

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   JWT_REFRESH_EXPIRE=30d

   # Email Configuration (Gmail)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password

   # Payment Gateways
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret

   # File Upload (Cloudinary)
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **Health Check**: `http://localhost:5000/health`

## 🗄 Database Setup

The application uses MongoDB. Make sure you have MongoDB running locally or provide a cloud MongoDB URI in the environment variables.

### Local MongoDB Setup:
1. Install MongoDB
2. Start MongoDB service
3. Create a database named `deshi-sahayak-hub`

### MongoDB Atlas (Cloud):
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get the connection string and add it to `MONGODB_URI`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Here's how it works:

1. **Register/Login**: Get access token and refresh token
2. **Protected Routes**: Include `Authorization: Bearer <token>` header
3. **Token Refresh**: Use refresh token to get new access tokens

### User Roles:
- **Customer**: Can book services, write reviews
- **Provider**: Can offer services, manage bookings
- **Admin**: Full system access

## 🚀 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `PUT /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `POST /verify-email/:token` - Verify email
- `POST /verify-phone` - Verify phone with OTP
- `POST /logout` - Logout

### Services (`/api/v1/services`)
- `GET /` - Get all services
- `GET /:id` - Get service by ID
- `GET /category/:category` - Get services by category
- `GET /search` - Search services
- `POST /` - Create service (Admin only)
- `PUT /:id` - Update service (Admin only)
- `DELETE /:id` - Delete service (Admin only)

### Users (`/api/v1/users`)
- `GET /` - Get all users (Admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user (Admin/Owner only)
- `DELETE /:id` - Delete user (Admin only)

### Service Providers (`/api/v1/providers`)
- `GET /` - Get all providers
- `GET /:id` - Get provider by ID
- `POST /` - Register as provider
- `PUT /:id` - Update provider profile
- `GET /:id/reviews` - Get provider reviews

### Bookings (`/api/v1/bookings`)
- `GET /` - Get user bookings
- `GET /:id` - Get booking by ID
- `POST /` - Create new booking
- `PUT /:id/status` - Update booking status
- `DELETE /:id` - Cancel booking

### Reviews (`/api/v1/reviews`)
- `GET /service/:serviceId` - Get service reviews
- `GET /provider/:providerId` - Get provider reviews
- `POST /` - Create review
- `PUT /:id` - Update review
- `DELETE /:id` - Delete review

### Payments (`/api/v1/payments`)
- `POST /create-order` - Create payment order
- `POST /verify-payment` - Verify payment
- `GET /transactions` - Get payment history

### Admin (`/api/v1/admin`)
- `GET /dashboard` - Get dashboard analytics
- `GET /users` - Manage users
- `GET /bookings` - Manage bookings
- `GET /analytics` - System analytics

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** to prevent API abuse
- **Input Validation** with express-validator
- **Security Headers** with Helmet.js
- **CORS Protection** configured for frontend
- **Account Locking** after failed login attempts
- **Password Hashing** with bcrypt
- **SQL Injection Protection** with Mongoose

## 📊 Monitoring & Logging

- **Winston Logging** with multiple log levels
- **Request Logging** with Morgan
- **Error Handling** with custom error classes
- **Health Check** endpoint for monitoring

## 🔄 Real-time Features

The API supports real-time communication using Socket.IO:

- **Booking Updates**: Real-time booking status changes
- **Notifications**: Instant notifications
- **Chat**: Real-time messaging between customers and providers

## 📱 Mobile App Support

The API is designed to support both web and mobile applications:

- **RESTful Design** for easy integration
- **JSON Responses** with consistent structure
- **File Upload Support** for images
- **Push Notifications** support (Firebase)

## 🚀 Deployment

### Production Environment Variables
Make sure to set these in production:
```env
NODE_ENV=production
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<strong-jwt-secret>
# ... other production values
```

### Docker Deployment
```bash
docker build -t deshi-sahayak-backend .
docker run -p 5000:5000 deshi-sahayak-backend
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Email: support@deshisahayak.com
- Documentation: [API Docs](http://localhost:5000/api-docs)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- MongoDB team for the powerful database
- All contributors and the open-source community

---

**Built with ❤️ for tier-2 and tier-3 cities in India**
