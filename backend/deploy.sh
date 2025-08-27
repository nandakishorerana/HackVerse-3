#!/bin/bash

# Deshi Sahayak Hub - Production Deployment Script
# Run this script on your production server

set -e  # Exit on any error

# Configuration
PROJECT_NAME="deshi-sahayak-hub"
PROJECT_DIR="/var/www/$PROJECT_NAME"
BACKUP_DIR="/var/backups/$PROJECT_NAME"
LOG_FILE="/var/log/$PROJECT_NAME-deploy.log"
NGINX_SITE_NAME="$PROJECT_NAME"
DB_NAME="deshi_sahayak_hub"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
    fi
    
    NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required. Current version: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    
    # Check nginx
    if ! command -v nginx &> /dev/null; then
        warn "Nginx is not installed. Please install nginx manually."
    fi
    
    # Check MongoDB
    if ! command -v mongod &> /dev/null && ! systemctl is-active --quiet mongod; then
        warn "MongoDB is not detected. Make sure MongoDB is installed and running."
    fi
    
    log "System requirements check completed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "/var/log/nginx"
    sudo mkdir -p "/var/www/$PROJECT_NAME/backend/logs"
    sudo mkdir -p "/var/www/$PROJECT_NAME/backend/uploads"
    
    # Set ownership
    sudo chown -R $(whoami):$(whoami) "$PROJECT_DIR"
    sudo chown -R $(whoami):$(whoami) "$BACKUP_DIR"
    
    log "Directories created successfully"
}

# Backup existing deployment
backup_existing() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        log "Creating backup of existing deployment..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        
        log "Backup created at $BACKUP_DIR/$BACKUP_NAME"
    fi
}

# Clone or update repository
setup_code() {
    log "Setting up application code..."
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        log "Updating existing repository..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        log "Cloning repository..."
        # Replace with your actual repository URL
        git clone https://github.com/your-username/deshi-sahayak-hub.git "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi
    
    log "Code setup completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_DIR/backend"
    
    # Install backend dependencies
    npm ci --production
    
    log "Dependencies installed successfully"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_DIR/backend"
    
    # Build TypeScript
    npm run build
    
    if [ ! -d "dist" ]; then
        error "Build failed - dist directory not found"
    fi
    
    log "Application built successfully"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    cd "$PROJECT_DIR/backend"
    
    if [ ! -f ".env.production" ]; then
        warn ".env.production not found. Please create it with your production settings."
        
        # Create template .env.production
        cat > .env.production << EOL
# Production Environment Variables
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/deshi_sahayak_hub
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_REFRESH_EXPIRE=30d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@deshisahayakhub.com
FROM_NAME=Deshi Sahayak Hub

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Payment
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Frontend
FRONTEND_URL=https://deshisahayakhub.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL
        
        error "Please edit .env.production with your actual credentials and run the script again."
    fi
    
    # Copy production env to .env
    cp .env.production .env
    
    log "Environment variables setup completed"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    cd "$PROJECT_DIR/backend"
    
    # Run database seeds for production (optional)
    # npm run seed:prod
    
    log "Database setup completed"
}

# Setup nginx
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    if [ -f "/etc/nginx/sites-available/$NGINX_SITE_NAME" ]; then
        log "Backing up existing nginx configuration..."
        sudo cp "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-available/$NGINX_SITE_NAME.backup"
    fi
    
    # Copy nginx configuration
    sudo cp "$PROJECT_DIR/backend/nginx.conf" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
    
    # Enable site
    if [ ! -f "/etc/nginx/sites-enabled/$NGINX_SITE_NAME" ]; then
        sudo ln -s "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/"
    fi
    
    # Test nginx configuration
    sudo nginx -t
    if [ $? -eq 0 ]; then
        log "Nginx configuration is valid"
    else
        error "Nginx configuration is invalid"
    fi
    
    log "Nginx setup completed"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if ! command -v certbot &> /dev/null; then
        warn "Certbot is not installed. Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Note: Replace with your actual domain
    DOMAIN="api.deshisahayakhub.com"
    
    info "Please ensure your domain $DOMAIN points to this server before continuing."
    read -p "Press enter to continue with SSL setup..."
    
    # Get SSL certificate
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@deshisahayakhub.com
    
    if [ $? -eq 0 ]; then
        log "SSL certificate obtained successfully"
    else
        warn "SSL certificate setup failed. You can run it manually later with: sudo certbot --nginx -d $DOMAIN"
    fi
}

# Deploy with PM2
deploy_pm2() {
    log "Deploying application with PM2..."
    
    cd "$PROJECT_DIR/backend"
    
    # Stop existing PM2 processes
    pm2 stop ecosystem.config.js 2>/dev/null || true
    pm2 delete ecosystem.config.js 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    log "PM2 deployment completed"
}

# Setup monitoring and logging
setup_monitoring() {
    log "Setting up monitoring and logging..."
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOL
/var/www/$PROJECT_NAME/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOL
    
    # Setup PM2 monitoring (optional)
    # pm2 install pm2-server-monit
    
    log "Monitoring and logging setup completed"
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Restart nginx
    sudo systemctl reload nginx
    
    # Restart PM2 processes
    pm2 reload ecosystem.config.js --env production
    
    log "Services restarted successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 5  # Wait for services to start
    
    # Check if application is responding
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log "Application health check passed"
    else
        error "Application health check failed"
    fi
    
    # Check nginx status
    if sudo systemctl is-active --quiet nginx; then
        log "Nginx is running"
    else
        error "Nginx is not running"
    fi
    
    # Check PM2 status
    if pm2 list | grep -q "online"; then
        log "PM2 processes are running"
    else
        error "PM2 processes are not running"
    fi
}

# Show deployment info
show_info() {
    log "Deployment completed successfully!"
    echo ""
    info "=== Deployment Information ==="
    info "Project Directory: $PROJECT_DIR"
    info "Log Files: $PROJECT_DIR/backend/logs/"
    info "Backup Directory: $BACKUP_DIR"
    info "Nginx Config: /etc/nginx/sites-available/$NGINX_SITE_NAME"
    echo ""
    info "=== Useful Commands ==="
    info "View logs: pm2 logs"
    info "Restart app: pm2 reload ecosystem.config.js --env production"
    info "Nginx test: sudo nginx -t"
    info "Nginx reload: sudo systemctl reload nginx"
    echo ""
    info "=== Next Steps ==="
    info "1. Update DNS records to point to this server"
    info "2. Configure SSL certificate if not done automatically"
    info "3. Set up monitoring and alerts"
    info "4. Configure backup strategy"
    info "5. Review and update environment variables in .env.production"
    echo ""
}

# Main deployment function
main() {
    log "Starting deployment of $PROJECT_NAME..."
    
    check_root
    check_requirements
    create_directories
    backup_existing
    setup_code
    install_dependencies
    build_application
    setup_environment
    setup_database
    setup_nginx
    
    # Ask about SSL setup
    read -p "Do you want to setup SSL certificates with Let's Encrypt? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    deploy_pm2
    setup_monitoring
    restart_services
    health_check
    show_info
}

# Handle script arguments
case "${1:-}" in
    "install")
        log "Installing system dependencies..."
        sudo apt-get update
        sudo apt-get install -y curl git nginx mongodb certbot python3-certbot-nginx
        
        # Install Node.js 18
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        # Install PM2
        sudo npm install -g pm2
        
        log "System dependencies installed successfully"
        ;;
    "update")
        log "Updating application..."
        cd "$PROJECT_DIR"
        git pull origin main
        cd backend
        npm ci --production
        npm run build
        pm2 reload ecosystem.config.js --env production
        log "Application updated successfully"
        ;;
    "rollback")
        if [ -z "${2:-}" ]; then
            error "Please specify backup name: ./deploy.sh rollback backup-20231201-120000"
        fi
        log "Rolling back to $2..."
        sudo rm -rf "$PROJECT_DIR"
        sudo cp -r "$BACKUP_DIR/$2" "$PROJECT_DIR"
        sudo chown -R $(whoami):$(whoami) "$PROJECT_DIR"
        cd "$PROJECT_DIR/backend"
        pm2 reload ecosystem.config.js --env production
        log "Rollback completed"
        ;;
    *)
        main
        ;;
esac
