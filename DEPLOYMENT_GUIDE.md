# 🚀 Chanspaw Platform - Deployment Guide

## Quick Deployment Options

### Option 1: Heroku (Recommended for Beginners)

1. **Create Heroku Account**: Sign up at [heroku.com](https://heroku.com)

2. **Install Heroku CLI**:
   ```bash
   npm install -g heroku
   ```

3. **Login to Heroku**:
   ```bash
   heroku login
   ```

4. **Create Production Build**:
   ```bash
   npm run build:production
   ```

5. **Deploy to Heroku**:
   ```bash
   cd dist
   git init
   git add .
   git commit -m "Initial production build"
   heroku create chanspaw-platform
   git push heroku main
   ```

6. **Set Environment Variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set JWT_REFRESH_SECRET=your-super-secret-refresh-key
   ```

7. **Open Your App**:
   ```bash
   heroku open
   ```

### Option 2: Railway

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)

2. **Connect GitHub Repository**:
   - Go to Railway Dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Build Settings**:
   - Set build command: `npm run build:production`
   - Set start command: `cd dist && npm start`

4. **Set Environment Variables**:
   - Go to Variables tab
   - Add all variables from `env.example`

5. **Deploy**:
   - Railway will automatically deploy on every push

### Option 3: Vercel

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)

2. **Import Project**:
   - Connect your GitHub repository
   - Vercel will auto-detect it's a Node.js project

3. **Configure Build Settings**:
   - Build Command: `npm run build:production`
   - Output Directory: `dist`
   - Install Command: `npm install && cd backend && npm install`

4. **Set Environment Variables**:
   - Go to Settings → Environment Variables
   - Add all variables from `env.example`

5. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Option 4: DigitalOcean App Platform

1. **Create DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)

2. **Create App**:
   - Go to App Platform
   - Click "Create App"
   - Connect your GitHub repository

3. **Configure App**:
   - Source Directory: `/dist`
   - Build Command: `npm run build:production`
   - Run Command: `npm start`

4. **Set Environment Variables**:
   - Add all variables from `env.example`

5. **Deploy**:
   - Click "Create Resources"
   - Your app will be deployed

## Local Production Build

### Build for Production

```bash
# Create production build
npm run build:production

# The dist folder will contain everything needed for deployment
```

### Test Production Build Locally

```bash
# Go to dist folder
cd dist

# Install dependencies
npm install

# Start the application
npm start
```

## Environment Variables

Copy `env.example` to `.env` and fill in your values:

```bash
# Backend Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DATABASE_URL="your-production-database-url"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Admin Configuration
ADMIN_EMAIL=admin@chanspaw.com
ADMIN_PASSWORD=Chanspaw@2025!

# Frontend Configuration
VITE_API_URL=https://your-domain.com
VITE_APP_NAME=Chanspaw Gaming Platform
```

## Database Setup

### For Production Database

1. **Set up PostgreSQL** (recommended for production):
   ```bash
   # Update DATABASE_URL in .env
   DATABASE_URL="postgresql://username:password@host:port/database"
   ```

2. **Run Database Migrations**:
   ```bash
   cd dist
   npx prisma generate
   npx prisma migrate deploy
   ```

### For SQLite (Development/Simple Production)

1. **Use SQLite** (included in dist folder):
   ```bash
   DATABASE_URL="file:./dev.db"
   ```

## Admin Access

After deployment, you can access the admin panel:

- **URL**: `https://your-domain.com/admin`
- **Email**: `admin@chanspaw.com`
- **Password**: `Chanspaw@2025!`

## Custom Domain Setup

### Heroku
```bash
heroku domains:add your-domain.com
```

### Railway
- Go to Settings → Domains
- Add your custom domain

### Vercel
- Go to Settings → Domains
- Add your custom domain

### DigitalOcean
- Go to Settings → Domains
- Add your custom domain

## SSL/HTTPS

All platforms above provide automatic SSL certificates.

## Monitoring & Logs

### Heroku
```bash
heroku logs --tail
```

### Railway
- Go to your app → Logs tab

### Vercel
- Go to your app → Functions tab

### DigitalOcean
- Go to your app → Logs tab

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check if all dependencies are installed
   - Verify Node.js version (>=18.0.0)

2. **Database Connection Error**:
   - Verify DATABASE_URL is correct
   - Check if database is accessible

3. **Admin Login Not Working**:
   - Verify admin credentials in .env
   - Check if database migrations ran

4. **CORS Errors**:
   - Update CORS_ORIGIN in .env
   - Make sure frontend URL is correct

### Support

If you encounter issues:

1. Check the logs: `heroku logs --tail` (or equivalent)
2. Verify environment variables are set correctly
3. Ensure database is properly configured
4. Check if all dependencies are installed

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring

## Performance Optimization

- [ ] Enable compression
- [ ] Use CDN for static assets
- [ ] Optimize database queries
- [ ] Enable caching
- [ ] Monitor performance metrics

---

**🎉 Your Chanspaw Platform is now ready for production deployment!** 