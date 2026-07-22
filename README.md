# XEARN

Plateforme panafricaine de micro-revenus digitaux. Les utilisateurs gagnent de l'argent (FCFA) en completant des micro-taches et via un systeme de parrainage a 3 niveaux.

## Stack

| Couche | Technologies |
|--------|-------------|
| **Web** | Next.js 15, React 19, TypeScript, TailwindCSS, framer-motion |
| **Mobile** | Expo SDK 52, Reanimated v3, expo-router |
| **Backend** | NestJS 11, Prisma 6, PostgreSQL 16 |
| **Auth** | JWT httpOnly + Google OAuth, CSRF double-submit |
| **Paiements** | FedaPay (Mobile Money) |
| **Monitoring** | Sentry (backend + frontend) |
| **Infra** | Railway (API), Vercel (web), Neon (DB) |
| **CI/CD** | GitHub Actions (lint + build + test + E2E) |

## Quick Start

```bash
git clone https://github.com/iruzen-dono/XEARN.git
cd XEARN && npm install

# Démarrer PostgreSQL
docker-compose up -d

# Configurer l'environnement
cp .env.example .env

# Initialiser la base
npm run db:migrate && npm run db:seed

# Lancer le dev
npm run dev
```

- Web : http://localhost:3000
- API : http://localhost:4000
- Swagger (dev only) : http://localhost:4000/api/docs
- Mobile : `cd apps/mobile && npx expo start`

## Structure

```
xearn/
  apps/
    api/          NestJS backend (16 modules, 40+ endpoints)
    web/          Next.js frontend (29 pages)
    mobile/       Expo React Native (5 screens premium)
  packages/types/ Types TypeScript partagés
  docs/           Documentation
  scripts/        Scripts utilitaires
  .github/workflows/ CI/CD pipelines
```

## Features

### ✅ Production-Ready

- ✅ **Authentification** (email + Google OAuth avec vérification email)
- ✅ **Système de comptes 3 tiers** (Normal → Premium → VIP)
- ✅ **Portefeuille** retraits Mobile Money (FedaPay) avec frais progressifs
- ✅ **Parrainage 3 niveaux** commissions automatiques (40%, 10%, 5%)
- ✅ **Gamification** — 16 badges (streak/tasks/referrals/earnings), streaks, classement
- ✅ **Notifications temps réel** (SSE) + badge de non-lues
- ✅ **Dashboard admin** — Statistiques, gestion utilisateurs, audit logs
- ✅ **App Mobile** — Expo/Reanimated, responsive, 5 écrans premium

### 🚧 En Développement (Désactivés en Beta)

- 🚧 **Tâches** - Module fonctionnel mais désactivé
  - Endpoints disponibles : `/api/tasks/*`
  - Anti-triche implémenté (session, cooldown)
  - Activation via `FEATURE_TASKS_ENABLED=true`

- 🚧 **Publicités (Pub Maker)** - Module fonctionnel mais désactivé
  - Endpoints disponibles : `/api/ads/*`
  - Approbation admin implémentée
  - Activation via `FEATURE_ADS_ENABLED=true`

## Sécurité

### 🔒 Protections Implémentées

**Sécurité Financière (Score: 9.5/10)**
- ✅ SELECT FOR UPDATE sur toutes les opérations wallet (anti-race condition)
- ✅ Vérification de retrait unique (empêche retraits multiples simultanés)
- ✅ Anti-replay webhook (table dédiée WebhookEvent)
- ✅ Idempotence des commissions (contrainte unique DB)
- ✅ Transactions atomiques Prisma sur toutes opérations critiques
- ✅ HMAC SHA-256 pour webhooks FedaPay

**Authentification & Autorisation**
- ✅ JWT httpOnly cookies + CSRF double-submit
- ✅ Google OAuth 2.0
- ✅ Rate limiting proxy-aware (IP réelle via X-Forwarded-For)
- ✅ RBAC strict (admin/user séparation)
- ✅ Anti-énumération emails

**Anti-Triche**
- ✅ Device fingerprinting
- ✅ Sessions de tâche obligatoires avec temps minimum
- ✅ Cooldown entre tâches (10 secondes)
- ✅ Limites de complétion avec lock FOR UPDATE

**Conformité & Audit**
- ✅ Audit logs pour toutes actions admin
- ✅ Soft delete pour conformité financière
- ✅ Réconciliation automatique (5 minutes)
- ✅ Webhook events tracking

**Infrastructure**
- ✅ Helmet security headers (CSP, HSTS, X-Frame-Options)
- ✅ Swagger désactivé en production
- ✅ Validation JWT au démarrage (fail-fast)
- ✅ Sentry monitoring (backend + frontend)

📄 **Rapport d'audit complet:** [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)

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
