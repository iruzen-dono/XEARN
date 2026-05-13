# 🚀 XEARN - DEPLOYMENT GUIDE

**Phase:** Production Deployment  
**Status:** Ready  
**Estimated Time:** 30-45 minutes

---

## Pre-Deployment Checklist

- [ ] Code committed to main branch
- [ ] Build passes locally: `npm run build`
- [ ] Tests pass: `npm test --workspace=apps/api`
- [ ] All environment variables documented
- [ ] GitHub, Railway, Vercel, Neon accounts ready
- [ ] Domain registered (if using custom domain)
- [ ] SSL certificate ready (or use provider's auto-SSL)

---

## Step 1: Create Database (Neon)

1. Go to https://console.neon.tech
2. Sign up / log in
3. Create new project: "XEARN Production"
4. Choose region closest to Africa (or EU)
5. Get connection string: `postgresql://...`
6. **Copy this value** - you'll need it for Step 2

**Time:** 5 minutes

---

## Step 2: Deploy Backend (Railway)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your XEARN repository
5. Railway auto-detects NestJS backend
6. **Set Environment Variables:**
   - `DATABASE_URL` = PostgreSQL connection string from Neon
   - Copy all other values from `.env.production.example`
   - Include: JWT_SECRET, GOOGLE_CLIENT_ID, FEDAPAY_API_KEY, SENTRY_DSN, etc.
7. Click "Deploy"
8. Railway auto-runs:
   - `npm install`
   - `npm run build:api`
   - `prisma migrate deploy` (auto-runs)
   - `npm run start --workspace=apps/api`

**What to expect:**
- Build takes 2-3 minutes
- Migrations run automatically
- API starts on port 3000
- Health check endpoint: `https://api.xearn.com/health`

**Time:** 10 minutes

---

## Step 3: Deploy Frontend (Vercel)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import XEARN repository
5. Framework: Auto-detected as Next.js
6. **Set Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = `https://api.xearn.com` (from Step 2)
7. Click "Deploy"
8. Vercel auto-runs:
   - `npm install`
   - `npm run build:web`
   - Generates `.next/` static site

**What to expect:**
- Build takes 1-2 minutes
- Frontend deployed to `https://YOUR_PROJECT.vercel.app`
- Can access admin dashboard at `/admin/analytics`

**Time:** 5 minutes

---

## Step 4: Configure DNS (Optional - if using custom domain)

### If using custom domain (e.g., xearn.com):

**Option A: Vercel nameservers**
1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Update nameservers to Vercel's:
   - ns1.vercel.com
   - ns2.vercel.com
   - ns3.vercel.com
   - ns4.vercel.com
3. Add to Vercel project settings: Domain
4. Propagation takes 24-48 hours

**Option B: CNAME records** (if registrar doesn't support nameserver change)
1. In domain registrar, create CNAME record:
   - Name: `@` or domain.com
   - Value: `cname.vercel.app`
2. Wait for DNS propagation (5-30 minutes)

### For API subdomain (api.xearn.com):
1. In Railway project, add custom domain
2. Railway provides DNS instructions
3. Or: Create CNAME → Railway URL

**Time:** 5 minutes (DNS may take 24-48 hours to fully propagate)

---

## Step 5: Validate Deployment

```bash
# Run validation script
node scripts/validate-deployment.js production
```

**Script checks:**
- ✅ Environment variables present
- ✅ Database connection working
- ✅ API responding
- ✅ Frontend accessible
- ✅ SSL certificates valid
- ✅ Health endpoints working

**Or manually verify:**

```bash
# API health check
curl https://api.xearn.com/health

# Frontend accessibility
curl https://xearn.com

# Analytics endpoint (requires admin auth)
curl https://api.xearn.com/admin/analytics/overview \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Time:** 5 minutes

---

## Step 6: Run Smoke Tests

```bash
# Run Playwright smoke tests against production
NEXT_PUBLIC_API_URL=https://api.xearn.com npx playwright test tests/smoke.spec.ts
```

**Tests verify:**
- ✅ Homepage loads
- ✅ Authentication flow works
- ✅ Wallet displays correctly
- ✅ Task listing works
- ✅ Referral system functional

**Time:** 5-10 minutes

---

## Monitoring After Deploy

### Sentry Error Tracking
- Dashboard: https://sentry.io/organizations/YOUR_ORG/issues/
- Errors appear in real-time
- Get alerted on critical errors

### Railway Logs
- Dashboard: https://railway.app/project/YOUR_PROJECT
- Click "Logs" tab
- Watch for database errors, API crashes

### Vercel Logs
- Dashboard: https://vercel.com/projects
- Click project → "Analytics" or "Functions"
- Check build logs and runtime errors

### Health Endpoint
```bash
# Should return { status: "up", database: "connected", uptime: ... }
curl https://api.xearn.com/health
```

---

## Troubleshooting

### Backend won't build on Railway

**Symptoms:** "Build failed"

**Solution:**
1. Check logs: Railway → Logs tab
2. Common issues:
   - Missing environment variable
   - TypeScript compilation error
   - Dependency not in package.json
3. Fix locally first: `npm run build:api`
4. Push to main → Railway auto-retries

### API working but frontend can't connect

**Symptoms:** Network errors in browser console

**Solution:**
1. Check: `NEXT_PUBLIC_API_URL` is set in Vercel
2. Check: API CORS headers configured
3. Restart Vercel deployment: "Redeploy"

### Database connection failing

**Symptoms:** `PrismaClientInitializationError`

**Solution:**
1. Verify `DATABASE_URL` format: `postgresql://USER:PASS@HOST/DB`
2. Check Neon console: Database > Connection string
3. Verify user has permission (create, read, write)
4. Test connection: `psql DATABASE_URL`

### DNS not propagating

**Symptoms:** Domain shows "Waiting for nameserver configuration"

**Solution:**
1. Wait 24-48 hours for full propagation
2. Check status: `nslookup xearn.com`
3. Use Vercel's temporary domain in interim
4. If stuck: Contact registrar support

---

## Post-Deploy Checklist

- [ ] Health endpoint responding
- [ ] Frontend accessible and loading
- [ ] Admin dashboard working
- [ ] Sentry capturing errors
- [ ] Database backups scheduled
- [ ] Monitoring alerts configured
- [ ] Documentation updated with live URLs
- [ ] Team notified of go-live

---

## Rollback (if needed)

### Quick rollback to previous version

**Railway:**
1. Go to Deployments
2. Click previous successful build
3. Click "Redeploy"

**Vercel:**
1. Go to Deployments
2. Click previous successful build
3. Click "Redeploy"

---

## Next: Scaling & Optimization

After successful deployment:
1. Monitor performance metrics
2. Run load testing
3. Optimize database queries if needed
4. Configure CDN caching
5. Set up auto-scaling rules
6. Plan Phase 7+ features

---

**Total Setup Time: 30-45 minutes**  
**Status: Ready for Production** ✅
