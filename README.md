# XEARN

Plateforme panafricaine de micro-revenus digitaux. Les utilisateurs gagnent de l'argent (FCFA) en completant des micro-taches et via un systeme de parrainage a 3 niveaux.

## Stack

| Couche | Technologies |
|--------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Backend | NestJS 11, Prisma 6, PostgreSQL 16 |
| Auth | JWT httpOnly + Google OAuth, CSRF double-submit |
| Paiements | FedaPay (Mobile Money) |
| Monitoring | Sentry (backend + frontend) |
| Infra | Railway (API), Vercel (web), Neon (DB) |
| CI/CD | GitHub Actions |

## Quick Start

```bash
git clone https://github.com/iruzen-dono/XEARN.git
cd XEARN && npm install

# Demarrer PostgreSQL
docker-compose up -d

# Configurer l'environnement
cp .env.example .env

# Initialiser la base
npm run db:migrate && npm run db:seed

# Lancer le dev
npm run dev
```

- Frontend : http://localhost:3000
- API : http://localhost:4000
- Swagger (dev only) : http://localhost:4000/api/docs

## Structure

```
xearn/
  apps/api/          NestJS backend (16 modules, 35+ endpoints)
  apps/web/          Next.js frontend (28 pages)
  packages/types/    Types TypeScript partages
  docs/              Documentation
  scripts/           Scripts utilitaires (validation, backup, health)
  .github/workflows/ CI/CD pipelines
```

## Features

- Authentification (email + Google OAuth)
- Systeme de comptes 3 tiers (Normal, Premium, VIP)
- Taches avec anti-triche (session, duree minimum, cooldown)
- Portefeuille avec retraits Mobile Money (FedaPay)
- Parrainage 3 niveaux avec commissions automatiques
- Gamification (streaks, badges, classement)
- Notifications temps reel (SSE)
- Dashboard admin avec analytics et exports CSV
- Publicites (Pub Maker) avec approbation admin

## Securite

- Rate limiting proxy-aware (IP reelle via X-Forwarded-For)
- SELECT FOR UPDATE sur toutes les operations wallet
- Swagger cache en production
- Validation JWT au demarrage (fail-fast)
- Anti-enumeration emails
- Reconciliation avec mutex
- Soft delete pour conformite financiere

## Tests

```bash
npm run test          # 99 tests unitaires
npm run lint          # ESLint strict
npm run build         # Type check + build complet
```

## Deploiement

Suivre [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md) pour le deploiement complet.

## Documentation

| Document | Contenu |
|----------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Setup dev local |
| [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md) | Guide de deploiement pas-a-pas |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Reference deploiement |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture systeme |
| [docs/API.md](docs/API.md) | Reference API REST |
| [docs/ROADMAP_AND_TODO.md](docs/ROADMAP_AND_TODO.md) | Roadmap post-beta |
| [CHANGELOG.md](CHANGELOG.md) | Historique des changements |

## Licence

Proprietary - (c) 2026 XEARN
