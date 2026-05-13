# 🚀 XEARN - Getting Started (Local Development)

**Quick start for developers working on XEARN locally.**

---

## Prerequisites

- **Node.js 22+** (`node --version`)
- **npm 10+** (`npm --version`)
- **PostgreSQL 16** (via Docker or local install)
- **Git** (for version control)

---

## Quick Start (5 minutes)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/xearn.git
cd xearn
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL (Docker)
docker-compose up -d

# Or if you have PostgreSQL locally:
# psql -U postgres -c "CREATE DATABASE xearn_dev;"
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env with your local values (already mostly configured)
```

### 4. Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### 5. Start Development

```bash
# Start both API and Web in parallel
npm run dev

# Or separately:
npm run dev:api    # NestJS on http://localhost:3000
npm run dev:web    # Next.js on http://localhost:3001
```

---

## What Works Now

Visit:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api
- **Database UI:** `npm run db:studio` (http://localhost:5555)

---

## Common Commands

```bash
# Building
npm run build              # Build everything
npm run build:api         # Build backend only
npm run build:web         # Build frontend only

# Testing
npm test --workspace=apps/api           # Unit tests
npx playwright test                     # E2E tests
npm run check                           # Lint + type check

# Database
npm run db:migrate        # Run migrations
npm run db:seed          # Seed test data
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma client

# Code Quality
npm run lint             # Check linting
npm run format          # Auto-format code
npm run format:check    # Check formatting

# Development
npm run dev             # Dev mode (both)
npm run dev:api        # Dev mode (API only)
npm run dev:web        # Dev mode (Web only)
```

---

## Project Structure

```
xearn/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/          # Source code
│   │   ├── test/         # Unit tests
│   │   ├── prisma/       # Database schema
│   │   └── dist/         # Build output
│   │
│   └── web/              # Next.js frontend
│       ├── src/          # React components
│       ├── public/       # Static assets
│       ├── tests/        # E2E tests
│       └── .next/        # Build output
│
├── packages/
│   └── types/            # Shared TypeScript types
│
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── .github/              # CI/CD workflows
```

---

## Debugging

### API Issues

```bash
# Check TypeScript
npx tsc --noEmit

# Check linting
npm run lint

# Watch logs
npm run dev:api
# Errors show in console

# Check database connection
npm run db:studio
```

### Frontend Issues

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Rebuild
npm run build:web

# Check browser console for errors
npm run dev:web
```

### Database Issues

```bash
# View current schema
npm run db:studio

# Reset database (CAREFUL!)
# Delete .postgresql_history and re-run migrations

# Check migrations
ls apps/api/prisma/migrations/
```

---

## Authentication

### Test Accounts

After seeding, test with:

**Admin Account:**
- Email: `admin@xearn.local`
- Password: `Admin@123456`

**User Account:**
- Email: `user@xearn.local`
- Password: `User@123456`

### Google OAuth (Optional)

1. Go to https://console.cloud.google.com
2. Create OAuth credentials (Web application)
3. Add `http://localhost:3001` to authorized redirect URIs
4. Copy Client ID to `.env`
5. Restart dev server

---

## Making Changes

### Adding a feature

1. Create branch: `git checkout -b feature/my-feature`
2. Make changes in `apps/api/` or `apps/web/`
3. Test: `npm test && npm run build`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Open PR on GitHub

### Database schema changes

1. Edit `apps/api/prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Update services if needed
4. Run tests

### Adding dependencies

```bash
# Frontend
npm install --workspace=apps/web PACKAGE_NAME

# Backend
npm install --workspace=apps/api PACKAGE_NAME

# Root
npm install PACKAGE_NAME --save-dev
```

---

## Testing

```bash
# Unit tests
npm test --workspace=apps/api

# E2E tests (requires dev server running)
# In another terminal:
npm run dev

# Then in first terminal:
npx playwright test

# Specific test file
npx playwright test tests/wallet.spec.ts

# Watch mode
npx playwright test --watch
```

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill process on port 3000
# Windows: taskkill /PID XXXX /F
# Mac/Linux: lsof -ti:3000 | xargs kill -9
```

### "Cannot find module '@xearn/types'"
```bash
# Run from root directory, not app subdirectory
cd xearn/        # Not apps/api or apps/web
npm run dev
```

### "Database connection failed"
```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection string in .env
echo $DATABASE_URL
```

### "Prisma client out of sync"
```bash
npm run db:generate
npm run build
```

---

## Documentation

For more information:
- **[README.md](README.md)** - Project overview
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/API.md](docs/API.md)** - API endpoint documentation
- **[docs/ROADMAP_AND_TODO.md](docs/ROADMAP_AND_TODO.md)** - Feature roadmap

---

## Need Help?

1. Check existing issues: https://github.com/yourusername/xearn/issues
2. Read documentation in `docs/`
3. Check console logs for errors
4. Run: `npm run build` to check for compilation errors

---

**Happy coding!** 🚀
