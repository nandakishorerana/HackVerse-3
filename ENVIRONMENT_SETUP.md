# Environment Setup Checklist

## ⚠️ Critical Configuration Items

The following environment variables in `backend/.env` need to be updated before deployment:

### 🔒 Security (CRITICAL)
- [ ] `JWT_SECRET` - Replace with a strong random string (minimum 32 characters)
- [ ] `JWT_REFRESH_SECRET` - Replace with a different strong random string
- [ ] Update default admin credentials if used

### 📧 Email Configuration
- [ ] `SMTP_USER` - Replace with your actual Gmail address
- [ ] `SMTP_PASS` - Replace with your Gmail app password
- [ ] `FROM_EMAIL` - Set your actual from email address

### 💳 Payment Gateway Setup
- [ ] `RAZORPAY_KEY_ID` - Your Razorpay key ID
- [ ] `RAZORPAY_KEY_SECRET` - Your Razorpay key secret
- [ ] `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (if using Stripe)
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key (if using Stripe)

### 📱 SMS Configuration (Optional)
- [ ] `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- [ ] `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- [ ] `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### ☁️ File Upload (Cloudinary)
- [ ] `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- [ ] `CLOUDINARY_API_KEY` - Your Cloudinary API key
- [ ] `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### 🗺️ Maps Integration
- [ ] `GOOGLE_MAPS_API_KEY` - Your Google Maps API key

### 🔔 Push Notifications (Optional)
- [ ] `FIREBASE_SERVER_KEY` - Your Firebase server key
- [ ] `FIREBASE_PROJECT_ID` - Your Firebase project ID

## 🎯 Environment-Specific Settings

### Development
Current configuration is set for development:
- `NODE_ENV=development`
- `MONGODB_URI=mongodb://localhost:27017/deshi-sahayak-hub`
- `REDIS_URL=redis://localhost:6379`
- `FRONTEND_URL=http://localhost:5173`

### Production
For production deployment, update:
- [ ] `NODE_ENV=production`
- [ ] Update database URIs to production servers
- [ ] Update `FRONTEND_URL` to your production domain
- [ ] Ensure all secrets are properly configured

## 🐳 Docker Environment Variables
The `docker-compose.yml` already includes development-safe defaults:
- MongoDB with root credentials
- Redis with password protection
- Backend with development JWT secrets (change for production!)

## 📋 Quick Setup Commands

1. **Generate JWT Secrets**:
   ```bash
   # Generate random JWT secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Verify Environment**:
   ```bash
   cd backend
   npm run build  # Check if backend builds successfully
   cd ..
   npm run build  # Check if frontend builds successfully
   ```

3. **Test with Docker**:
   ```bash
   docker-compose up -d mongodb redis
   # Wait for services to start, then:
   docker-compose up backend frontend
   ```

## ⚡ Status
- ✅ Environment file exists
- ⚠️  Most secrets need to be configured with actual values
- ✅ Database configuration is ready for Docker
- ⚠️  Payment gateways need actual credentials
- ⚠️  External service APIs need actual keys

## 🔍 Validation
Run these commands to verify your setup:

```bash
# Check if all required services can connect
curl http://localhost:5000/health

# Check MongoDB connection
docker-compose logs mongodb

# Check Redis connection  
docker-compose logs redis

# Check backend logs
docker-compose logs backend
```
