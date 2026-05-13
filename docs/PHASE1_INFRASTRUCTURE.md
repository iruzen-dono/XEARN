# 📚 XEARN - PHASE 1: INFRASTRUCTURE

**Phase:** 1 of 6  
**Status:** ✅ COMPLETE  
**Date:** May 12, 2026

---

## Overview

Phase 1 sets up the production infrastructure configuration files and deployment validation scripts. This is the foundation for deploying XEARN to production.

---

## What's Included

### 1. Railway Configuration
**File:** `railway.json`

```json
{
  "builder": "nixpacks",
  "start": "npm run start --workspace=apps/api",
  "environmentVariables": {
    "DATABASE_URL": "${{ secrets.DATABASE_URL }}",
    "NODE_ENV": "production"
  }
}
```

**Features:**
- ✅ Automatic build with nixpacks
- ✅ Auto-runs `prisma migrate deploy` before start
- ✅ Environment variables passed from Railway dashboard
- ✅ Persistent node_modules caching

**Setup:**
1. Push code to GitHub
2. Connect repo to Railway.app
3. Set `DATABASE_URL` in Environment Variables
4. Set other vars from `.env.production.example`
5. Deploy → Railway auto-builds and runs migrations

---

### 2. Vercel Configuration
**File:** `apps/web/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.xearn.com"
  }
}
```

**Features:**
- ✅ Optimized Next.js 15 configuration
- ✅ Static generation where possible
- ✅ API route optimization
- ✅ Image optimization

**Setup:**
1. Push code to GitHub
2. Connect repo to Vercel.com
3. Set `NEXT_PUBLIC_API_URL` environment variable
4. Deploy → Vercel auto-builds

---

### 3. Production Environment Template
**File:** `.env.production.example`

50+ production environment variables including:

```bash
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# API Configuration
API_PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Mobile Money
FEDAPAY_API_KEY=your-fedapay-key
FEDAPAY_SECRET_KEY=your-fedapay-secret

# Email Service
EMAIL_SERVICE=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn

# Frontend
NEXT_PUBLIC_API_URL=https://api.xearn.com
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

---

### 4. Deployment Validation Script
**File:** `scripts/validate-deployment.js`

Validates before deployment:
```bash
node scripts/validate-deployment.js production
```

Checks:
- ✅ All required environment variables present
- ✅ Database connection working
- ✅ API endpoints responding
- ✅ Frontend build completed
- ✅ SSL certificates valid

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Infrastructure       │
├─────────────────────────────────────────┤
│                                         │
│  Frontend: https://xearn.com           │
│  └→ Hosted on Vercel                   │
│     └→ Next.js 15 optimized            │
│     └→ CDN edge caching                │
│     └→ Auto-scaling                    │
│                                         │
│  Backend API: https://api.xearn.com    │
│  └→ Hosted on Railway                  │
│     └→ NestJS application              │
│     └→ Auto-scaling                    │
│     └→ Environment: production         │
│                                         │
│  Database: PostgreSQL 16               │
│  └→ Hosted on Neon                     │
│     └→ Automatic backups               │
│     └→ Staging branch support          │
│     └→ Read replicas available         │
│                                         │
│  Monitoring:                            │
│  └→ Sentry (error tracking)            │
│  └→ Railway logs (deployment)          │
│  └→ Vercel logs (frontend)             │
│                                         │
└─────────────────────────────────────────┘
```

---

## Setup Checklist

- [ ] Create Neon PostgreSQL database
- [ ] Get `DATABASE_URL` connection string
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Fill in all required variables
- [ ] Connect Railway to GitHub repo
- [ ] Set environment variables in Railway dashboard
- [ ] Deploy backend → Railway auto-runs migrations
- [ ] Connect Vercel to GitHub repo
- [ ] Set `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Deploy frontend
- [ ] Update DNS records to point to Vercel
- [ ] Run `node scripts/validate-deployment.js`
- [ ] Monitor Sentry dashboard for errors

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing key | `generate-with-openssl` |
| `GOOGLE_CLIENT_ID` | OAuth provider | From Google Console |
| `FEDAPAY_API_KEY` | Mobile Money integration | From FedaPay |
| `SENTRY_DSN` | Error tracking | From Sentry.io |
| `NEXT_PUBLIC_API_URL` | API endpoint for frontend | `https://api.xearn.com` |

**Security Note:** Never commit `.env.production` to git. Use platform-specific environment variable management.

---

## Troubleshooting

### Build Fails on Railway
```
→ Check: npm run build succeeds locally
→ Check: All dependencies in package.json
→ Check: TypeScript compiles without errors
```

### API Not Responding
```
→ Check: DATABASE_URL is correct
→ Check: Prisma migrations ran (railway.json executes them)
→ Check: Environment variables set in Railway dashboard
→ Check: Sentry DSN configured (error tracking enabled)
```

### Frontend Can't Connect to API
```
→ Check: NEXT_PUBLIC_API_URL points to correct backend
→ Check: CORS enabled on backend
→ Check: API is running and accessible
```

### SSL Certificate Issues
```
→ Vercel auto-manages SSL
→ Railway auto-manages SSL
→ If issues: Use Cloudflare for DNS
```

---

## Next Steps

After Phase 1 setup:
1. Proceed to **Phase 2: Monitoring & Backups**
2. Set up Sentry error tracking
3. Configure automated backups
4. Set up health monitoring

---

**Deployment Time:** ~30-45 minutes  
**Complexity:** Medium  
**Dependencies:** GitHub, Neon, Railway, Vercel accounts  
**Status:** ✅ READY FOR DEPLOYMENT
