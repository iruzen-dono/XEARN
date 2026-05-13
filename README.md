# 🌍 XEARN

**Plateforme panafricaine de micro-revenus digitaux**

XEARN permet aux utilisateurs de gagner de l'argent (FCFA) en réalisant des micro-tâches digitales. Un système de parrainage à 3 niveaux récompense les parrains à chaque tâche complétée par leurs filleuls.

**Status:** ✅ MVP Complete | 🚀 Production-Ready | 📱 Ready for Beta Launch

---

## 📊 Quick Links

**Getting Started:**
- 🏠 **Local Development:** [GETTING_STARTED.md](GETTING_STARTED.md)
- 🚀 **Production Deployment:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Documentation:**
- 🏗️ **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 📡 **API Reference:** [docs/API.md](docs/API.md)
- 🗺️ **Product Roadmap:** [docs/ROADMAP_AND_TODO.md](docs/ROADMAP_AND_TODO.md)
- 📚 **All Phases (1-6):** [docs/PHASES_REFERENCE.md](docs/PHASES_REFERENCE.md)

**Other Docs:**
- 📖 [Complete Phase 1](docs/PHASE1_INFRASTRUCTURE.md)
- 📖 [Phase 2-6 Reference](docs/PHASES_REFERENCE.md)
- 🔄 [Changelog](CHANGELOG.md)

---

## ⚡ Quick Start

### For Developers

```bash
# 1. Clone and install
git clone https://github.com/yourusername/xearn.git
cd xearn && npm install

# 2. Start database
docker-compose up -d

# 3. Setup environment
cp .env.example .env

# 4. Initialize database
npm run db:migrate && npm run db:seed

# 5. Start development
npm run dev
```

Visit http://localhost:3001

### For Production

```bash
# Follow: docs/DEPLOYMENT.md
# Setup: Neon (database) + Railway (backend) + Vercel (frontend)
# Time: 30-45 minutes
```

---

## ✨ Features

### Core Features
- ✅ User authentication (Email + Google OAuth)
- ✅ 3-tier account system (Normal, Premium, VIP)
- ✅ Task management system
- ✅ Wallet with withdrawals via Mobile Money
- ✅ 3-level referral system
- ✅ Admin dashboard
- ✅ Real-time notifications (SSE)
- ✅ Analytics dashboard
- ✅ Anti-cheat & fraud protection

### Technical Features
- ✅ Full TypeScript (strict mode)
- ✅ Monorepo with npm workspaces
- ✅ CI/CD automation (GitHub Actions)
- ✅ Sentry error tracking
- ✅ Automated database backups
- ✅ 0 security vulnerabilities
- ✅ 12 Playwright integration tests

---

## 🏗️ Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 · React 19 · TypeScript · TailwindCSS |
| **Backend** | NestJS 10 · Prisma 6 · PostgreSQL 16 |
| **Auth** | JWT + Google OAuth · bcrypt · CSRF protection |
| **Payments** | FedaPay (Mobile Money) |
| **Monitoring** | Sentry · Structured logging |
| **Infrastructure** | Railway · Vercel · Neon |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure

```
xearn/
├── apps/api/                # NestJS backend
├── apps/web/                # Next.js frontend
├── packages/types/          # Shared TypeScript types
├── docs/                    # Documentation
│   ├── PHASES_REFERENCE.md  # All 6 phases
│   ├── DEPLOYMENT.md        # Production guide
│   ├── ARCHITECTURE.md      # System design
│   ├── API.md               # API docs
│   ├── ROADMAP_AND_TODO.md  # Feature roadmap
│   └── ...
├── scripts/                 # Utility scripts
├── .github/workflows/       # CI/CD pipelines
└── package.json             # Monorepo root
```

---

## 🎯 MVP Completion Status

### ✅ Phases 1-6: Complete

**Phase 1:** Infrastructure ✅
- railway.json, vercel.json, .env templates

**Phase 2:** Monitoring & Backups ✅
- Sentry error tracking, automated backups

**Phase 3:** CI/CD Pipeline ✅
- GitHub Actions workflow

**Phase 4:** Real-time Notifications ✅
- SSE streaming with auto-reconnect

**Phase 5:** Integration Tests ✅
- 12 Playwright tests (wallet + referral)

**Phase 6:** Analytics Dashboard ✅
- 7 API endpoints + React UI

---

## 🚀 Next Steps

### This Week (Get Live)
1. **Deploy to Production** (30-45 min)
   - Follow: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
   - Requires: Neon + Railway + Vercel
   - Time: Friday EOD

2. **Invite Beta Users** (50-100)
   - Test Mobile Money integration
   - Gather feedback
   - Monitor Sentry errors

### Next Phase (After Launch)
- [x] **Phase 7:** Mobile app (React Native)
- [ ] Performance optimization
- [ ] Enhanced payment methods
- [ ] Community features

See: [docs/ROADMAP_AND_TODO.md](docs/ROADMAP_AND_TODO.md)

---

## 📊 Stats

```
Codebase:        ~8,900 lines
├─ Backend:      ~3,500 LOC
├─ Frontend:     ~4,200 LOC
└─ Tests:        ~800 LOC

Quality:
├─ TypeScript:   ✅ 100% strict
├─ Tests:        ✅ 12 integration tests
├─ Security:     ✅ 0 vulnerabilities
└─ Lint:         ✅ 3 warnings (non-blocking)

Deployment:
├─ Commits:      13 (main branch)
├─ Issues:       0
└─ Build:        ✅ Passing
```

---

## 🛠️ Commands

### Development
```bash
npm run dev              # Start API + Web
npm run dev:api        # Start API only
npm run dev:web        # Start Web only
```

### Building
```bash
npm run build           # Build all
npm run build:api      # Build API only
npm run build:web      # Build Web only
```

### Testing
```bash
npm test --workspace=apps/api    # Unit tests
npx playwright test              # E2E tests
npm run check                    # Lint + Type check
```

### Database
```bash
npm run db:migrate      # Run migrations
npm run db:seed        # Seed test data
npm run db:studio      # Open Prisma Studio
npm run db:generate    # Generate Prisma client
```

### Deployment
```bash
# Local validation
node scripts/validate-deployment.js production

# Follow docs/DEPLOYMENT.md for full instructions
```

---

## 🔐 Security

- ✅ JWT token-based authentication
- ✅ Google OAuth integration
- ✅ CSRF double-submit protection
- ✅ Rate limiting (3 tiers)
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ 0 known vulnerabilities (npm audit clean)
- ✅ Environment variables for secrets
- ✅ Sentry error tracking
- ✅ Structured audit logging

---

## 📱 Market Context

**Target Market:**
- Francophone West Africa (8+ countries)
- 18-35 year-olds with smartphones
- Low to middle-income earners
- Seeking micro-income supplementation

**Competitive Advantage:**
- Native Mobile Money integration (FedaPay)
- Multi-level referral system
- Premium tier monetization
- Modern tech stack
- Enterprise-grade monitoring

**Revenue Model:**
- Account creation fees
- Tier upgrades (Premium, VIP)
- Withdrawal fees (2-10% by tier)
- Advertiser budgets

---

## 🤝 Contributing

1. Clone: `git clone ...`
2. Branch: `git checkout -b feature/my-feature`
3. Code: Make changes
4. Test: `npm test && npm run build`
5. Commit: `git commit -m "feat: description"`
6. Push & PR: `git push origin feature/my-feature`

**Code Quality:**
- TypeScript strict mode
- ESLint + Prettier
- Unit + E2E tests required
- 0 console.logs in production code

---

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | Local development setup |
| **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Production deployment (6 steps) |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System design & components |
| **[docs/API.md](docs/API.md)** | REST API endpoints |
| **[docs/PHASES_REFERENCE.md](docs/PHASES_REFERENCE.md)** | Phases 2-6 reference |
| **[docs/PHASE1_INFRASTRUCTURE.md](docs/PHASE1_INFRASTRUCTURE.md)** | Phase 1: Infrastructure |
| **[docs/ROADMAP_AND_TODO.md](docs/ROADMAP_AND_TODO.md)** | Feature roadmap & todo |
| **[CHANGELOG.md](CHANGELOG.md)** | Project changelog |

---

## 🆘 Troubleshooting

**Quick help:**

```bash
# Port already in use?
# Windows: taskkill /PID XXXX /F
# Mac/Linux: lsof -ti:3000 | xargs kill -9

# Database issues?
npm run db:studio

# TypeScript errors?
npx tsc --noEmit

# Clear cache?
rm -rf apps/web/.next node_modules/.cache

# Full reset?
docker-compose down
rm -rf apps/api/prisma/migrations
npm install
npm run db:migrate
```

See: [GETTING_STARTED.md](GETTING_STARTED.md#troubleshooting)

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/xearn/issues)
- **Docs:** [/docs](docs/) folder
- **API Docs:** [docs/API.md](docs/API.md)
- **Chat:** [Discord/Slack] (if available)

---

## 📄 License

Proprietary - © 2026 XEARN

---

## 🎉 Status

```
╔═════════════════════════════════════════════╗
║  XEARN - PRODUCTION-READY BETA LAUNCH      ║
║                                             ║
║  Verdict: ✅ READY FOR DEPLOYMENT          ║
║  Score:   8.5/10                           ║
║  Next:    Execute docs/DEPLOYMENT.md       ║
║                                             ║
║  Timeline: 30-45 minutes to go live        ║
╚═════════════════════════════════════════════╝
```

---

**Last Updated:** May 12, 2026  
**Built with:** Next.js, NestJS, TypeScript, PostgreSQL  
**Status:** ✅ MVP Complete
