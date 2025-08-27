# Deshi Sahayak Hub 🏡

> **A comprehensive local home services marketplace platform for tier-2 and tier-3 cities in India**

Deshi Sahayak Hub is a full-stack web application that connects customers with verified local service providers for various home services like cleaning, plumbing, electrical work, carpentry, and more. Built with modern technologies to ensure scalability, security, and excellent user experience.

## 🌟 Features

### For Customers
- 🔍 **Service Discovery**: Search and browse various home services
- 👨‍🔧 **Provider Profiles**: View detailed profiles, ratings, and reviews
- 📅 **Easy Booking**: Schedule services at your convenience
- 💳 **Secure Payments**: Razorpay integration for safe transactions
- 📱 **Real-time Updates**: Track booking status with live notifications
- ⭐ **Review System**: Rate and review service providers
- 📍 **Location-based**: Find services in your city

### For Service Providers
- 📝 **Profile Management**: Create comprehensive service profiles
- 📊 **Dashboard**: Manage bookings and track earnings
- 🎯 **Service Areas**: Define your service coverage areas
- 🏆 **Ratings & Reviews**: Build reputation through customer feedback
- 💼 **Portfolio Showcase**: Display your previous work
- 📅 **Availability Management**: Set your working hours and availability

### For Administrators
- 👥 **User Management**: Manage customers and service providers
- 🛡️ **Verification System**: Verify provider documents and credentials
- 📈 **Analytics Dashboard**: Monitor platform usage and performance
- ⚙️ **Service Management**: Add, edit, and manage service categories
- 🚨 **Content Moderation**: Review reports and manage disputes

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful and accessible component library
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Zustand** - State management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe development
- **MongoDB** - NoSQL database with Mongoose ODM
- **Redis** - Caching and session storage
- **Socket.IO** - Real-time communication
- **JWT** - Authentication and authorization
- **Bcrypt** - Password hashing
- **Multer + Cloudinary** - File upload and storage
- **Nodemailer** - Email services
- **Twilio** - SMS notifications

### Payment & External Services
- **Razorpay** - Payment gateway (primary)
- **Stripe** - Payment gateway (secondary)
- **Cloudinary** - Image storage and optimization
- **Google Maps API** - Location services
- **Firebase** - Push notifications

### Development & Deployment
- **Docker** - Containerization
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Winston** - Logging
- **PM2** - Process management

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (v7 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd deshi-sahayak-hub-main
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env file with your configuration
   npm run build
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   # In a new terminal, from project root
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Using Docker (Recommended)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 Documentation

### API Documentation
The API is fully documented with Swagger/OpenAPI. Once the backend is running, visit:
- **Swagger UI**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health

### Key API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `GET /api/v1/auth/me` - Get user profile

#### Services
- `GET /api/v1/services` - Get all services with filters
- `GET /api/v1/services/:id` - Get service details
- `GET /api/v1/services/search` - Search services
- `GET /api/v1/services/category/:category` - Get services by category

#### Bookings
- `POST /api/v1/bookings` - Create new booking
- `GET /api/v1/bookings` - Get user bookings
- `PUT /api/v1/bookings/:id/status` - Update booking status

### Database Schema

The application uses MongoDB with the following main collections:
- **Users** - Customer and provider accounts
- **Services** - Available service types
- **ServiceProviders** - Provider profiles and details
- **Bookings** - Service bookings and status
- **Reviews** - Customer reviews and ratings
- **Notifications** - System notifications

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/deshi-sahayak-hub
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRE=30d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateways
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:watch
npm run test:coverage

# Frontend tests
npm test
```

## 📦 Deployment

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
npm run build
npm run preview
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t deshi-sahayak-backend ./backend
docker run -p 5000:5000 deshi-sahayak-backend
```

### PM2 Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit
```

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** to prevent API abuse
- **Input Validation** with express-validator and Zod
- **Security Headers** with Helmet.js
- **CORS Protection** configured for frontend
- **Account Locking** after failed login attempts
- **Password Hashing** with bcrypt
- **SQL Injection Protection** with Mongoose
- **XSS Protection** with sanitization

## 🎯 Service Categories

- 🧹 **Cleaning** - House cleaning, deep cleaning, office cleaning
- 🔧 **Plumbing** - Pipe repairs, fixture installation, emergency repairs
- ⚡ **Electrical** - Wiring, repairs, appliance installation
- 🔨 **Carpentry** - Furniture repair, custom woodwork, installations
- 🎨 **Painting** - Interior/exterior painting, wall treatments
- 🔌 **Appliance Repair** - AC, refrigerator, washing machine repairs
- 🌱 **Gardening** - Landscaping, plant care, lawn maintenance
- 🚗 **Vehicle Repair** - Car/bike servicing and repairs
- 💄 **Beauty** - Home salon services, grooming
- 📚 **Tutoring** - Home tutoring, skill development
- 💪 **Fitness** - Personal training, yoga, physiotherapy

## 🌍 Localization

The platform is designed for Indian tier-2 and tier-3 cities with:
- **Hindi and English** language support
- **Indian Rupee** currency
- **Indian phone number** format validation
- **Local payment methods** integration
- **Regional service categories**

## 📊 Analytics & Monitoring

- **User Analytics** - Registration, engagement, retention
- **Service Analytics** - Popular services, booking trends
- **Provider Analytics** - Performance, earnings, ratings
- **System Monitoring** - API performance, error tracking
- **Business Metrics** - Revenue, growth, customer satisfaction

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Update API documentation for new endpoints
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: support@deshisahayak.com
- **Documentation**: [API Documentation](http://localhost:5000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 Acknowledgments

- **Express.js** team for the excellent web framework
- **MongoDB** team for the powerful database
- **React** team for the amazing frontend library
- **Tailwind CSS** for the utility-first CSS framework
- **Shadcn/ui** for the beautiful component library
- All contributors and the open-source community

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Basic service booking platform
- ✅ User authentication and profiles
- ✅ Payment integration
- ✅ Review system
- ✅ Admin dashboard

### Phase 2 (Upcoming)
- 🔄 Mobile app development
- 🔄 Advanced search filters
- 🔄 Service provider verification
- 🔄 Multi-language support
- 🔄 Advanced analytics

### Phase 3 (Future)
- 📋 AI-powered service recommendations
- 📋 Voice-based booking
- 📋 IoT integration for smart homes
- 📋 Franchise model for other cities
- 📋 B2B services for businesses

---

**Built with ❤️ for tier-2 and tier-3 cities in India**

*Empowering local communities through technology, one service at a time.*

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/bc5fb704-4d66-4fbb-b23e-8d00ddd15b7f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bc5fb704-4d66-4fbb-b23e-8d00ddd15b7f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bc5fb704-4d66-4fbb-b23e-8d00ddd15b7f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
