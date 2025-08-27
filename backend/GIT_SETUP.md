# Git Repository Setup Instructions

## Step 1: Install Git (if not already installed)

### Option 1: Download from Official Website
1. Go to https://git-scm.com/download/windows
2. Download the latest version of Git for Windows
3. Run the installer with default settings
4. Restart your command prompt/PowerShell

### Option 2: Using Package Manager (if available)
```powershell
# Using Chocolatey (if installed)
choco install git

# Using winget (Windows Package Manager)
winget install Git.Git

# Using Scoop (if installed)
scoop install git
```

## Step 2: Configure Git (First Time Setup)
After installing Git, configure your user information:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize Git Repository

Once Git is installed, run these commands in the backend directory:

```bash
# Initialize the Git repository
git init

# Add all files to staging area
git add .

# Create initial commit
git commit -m "Initial commit: Deshi Sahayak Hub backend API

- Complete Node.js/Express.js backend with TypeScript
- JWT-based authentication system with role management
- MongoDB integration with Mongoose ODM
- Comprehensive error handling and validation
- API documentation with Swagger/OpenAPI
- Security middleware (helmet, cors, rate limiting)
- Real-time features with Socket.IO
- Redis caching integration
- Winston logging system
- Environment configuration
- Development and production ready setup"

# Optional: Connect to remote repository
# git remote add origin https://github.com/yourusername/your-repo.git
# git branch -M main
# git push -u origin main
```

## Step 4: Verify Repository Status

Check that everything is properly tracked:

```bash
# Check repository status
git status

# View commit history
git log --oneline

# View all files being tracked
git ls-files
```

## Project Structure in Git

After initialization, your Git repository will include:

```
backend/
├── .git/                 # Git repository data
├── .gitignore            # Files to ignore in version control
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── server.ts         # Main server file
├── logs/
│   └── .gitkeep          # Keep directory in git
├── uploads/
│   └── .gitkeep          # Keep directory in git
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── nodemon.json          # Development server configuration
├── .env.example          # Environment variables template
└── README.md             # Project documentation
```

## Important Notes

1. **Environment Variables**: The `.env` file is ignored by Git for security. Always use `.env.example` as a template.

2. **Node Modules**: The `node_modules/` directory is ignored as it can be regenerated with `npm install`.

3. **Build Output**: The `dist/` directory (TypeScript compiled output) is ignored as it's generated during build.

4. **Logs and Uploads**: Contents of `logs/` and `uploads/` are ignored, but the directories are kept with `.gitkeep` files.

## Next Steps

After Git setup:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development**:
   ```bash
   npm run dev
   ```

4. **Create Remote Repository** (optional):
   - Create a new repository on GitHub/GitLab
   - Connect your local repository to the remote
   - Push your code

## Useful Git Commands for Development

```bash
# Check current status
git status

# Add files to staging
git add .

# Commit changes
git commit -m "Your commit message"

# View commit history
git log --oneline

# Create and switch to new branch
git checkout -b feature-branch-name

# Switch between branches
git checkout main
git checkout feature-branch-name

# Merge branch
git checkout main
git merge feature-branch-name

# Push to remote repository
git push origin main
```

## Branching Strategy Recommendation

For this project, consider using:

```bash
main          # Production-ready code
develop       # Development branch
feature/*     # Feature branches
bugfix/*      # Bug fix branches
hotfix/*      # Emergency fixes
```

Example:
```bash
git checkout -b feature/user-management
git checkout -b feature/booking-system
git checkout -b bugfix/auth-validation
```
