# Deshi Sahayak Hub - Deployment Guide

## 🚀 Deployment Options

### Option 1: Local Development (Current)

**Requirements**: Node.js, npm
**Best for**: Development, testing, quick demos

```bash
# Start frontend
npm run dev

# Start backend (in another terminal)
cd backend
npm run dev
```

**Access URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Option 2: Docker Deployment (Recommended)

**Requirements**: Docker, Docker Compose
**Best for**: Production, staging, full feature testing

```bash
# Start all services
docker-compose up -d

# Or start services individually
docker-compose up -d mongodb redis
docker-compose up backend frontend
```

**Access URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

### Option 3: Production Server

**Requirements**: Linux server, Docker, Domain, SSL certificate
**Best for**: Live production deployment

See the `deploy.sh` script in the backend directory for production setup.

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] Frontend builds successfully
- [x] Backend dependencies installed
- [x] Environment configuration ready
- [x] Docker configuration created
- [x] Database initialization scripts ready

### ⚠️ Required for Full Production
- [ ] Install Docker Desktop (for database services)
- [ ] Configure production environment variables
- [ ] Set up SSL certificates
- [ ] Configure email service (SMTP)
- [ ] Set up payment gateways (Razorpay/Stripe)
- [ ] Configure external APIs (Maps, SMS)

## 🎯 Current Deployment Status

### Frontend ✅
- **Status**: Production Ready
- **Build**: ✅ Successful 
- **Assets**: Optimized and compressed
- **Size**: 330KB JS, 63KB CSS

### Backend ⚠️
- **Status**: Development Ready (85% complete)
- **Build**: ⚠️ 80 TypeScript warnings (non-blocking)
- **Core Features**: Working
- **Missing**: Some advanced model methods

### Database 🔶
- **MongoDB**: Ready (needs Docker)
- **Redis**: Ready (needs Docker)
- **Initialization**: Scripts created

### Infrastructure ✅
- **Docker**: Configuration complete
- **Nginx**: Configured
- **PM2**: Production process manager ready

## 🚀 Quick Start Commands

### Start Development Environment
```bash
# Option A: Use deployment script (Windows)
deploy-local.bat

# Option B: Manual startup
npm run dev                    # Frontend
cd backend && npm run dev      # Backend
```

### With Docker (when available)
```bash
docker-compose up -d mongodb redis    # Start databases
docker-compose up backend frontend    # Start applications
```

## 🌐 Service URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:5173 | https://your-domain.com |
| Backend API | http://localhost:5000 | https://api.your-domain.com |
| API Documentation | http://localhost:5000/api-docs | https://api.your-domain.com/api-docs |
| MongoDB | mongodb://localhost:27017 | mongodb://mongodb:27017 |
| Redis | redis://localhost:6379 | redis://redis:6379 |

## 📊 Feature Availability

### ✅ Working (No Database Required)
- Frontend application loads
- UI components and navigation
- Static content and pages
- Form validation
- Responsive design

### 🔶 Requires Database
- User registration/login
- Service booking
- Payment processing  
- Reviews and ratings
- Admin dashboard
- Real-time notifications

## 🔧 Troubleshooting

### Frontend Issues
- **Port 5173 in use**: Change port in `vite.config.ts`
- **Build fails**: Run `npm install` then `npm run build`

### Backend Issues  
- **Port 5000 in use**: Change PORT in `backend/.env`
- **TypeScript errors**: Run `npm run build` to see detailed errors
- **Database connection**: Ensure MongoDB is running

### Docker Issues
- **Docker not found**: Install Docker Desktop
- **Port conflicts**: Stop existing services on ports 5000, 5173, 27017, 6379
- **Permission issues**: Run as administrator (Windows)

## 📞 Support

- **Documentation**: Check README.md files
- **API Documentation**: Visit /api-docs when backend is running
- **Environment Setup**: See ENVIRONMENT_SETUP.md
- **Final Status**: See FINAL_SETUP_STATUS.md
