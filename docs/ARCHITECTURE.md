# Architecture technique — XEARN

Ce document décrit l'architecture de la plateforme XEARN, un monorepo full-stack basé sur Next.js et NestJS.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│                    Client (Navigateur)               │
│                                                     │
│   Next.js 15 (React 19)  ─── port 3000             │
│   ├── Pages SSR/CSR                                 │
│   ├── AuthContext (JWT + Google OAuth)              │
│   ├── NextAuth v4 (Google Provider)                 │
│   ├── TailwindCSS                                  │
│   └── Toast System                                 │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP (fetch)
                       │  Authorization: Bearer <JWT>
                       ▼
┌─────────────────────────────────────────────────────┐
│                  API NestJS  ─── port 4000          │
│                  Préfixe: /api                      │
│                                                     │
│   ┌─────────┐ ┌─────────┐ ┌──────────┐             │
│   │  Auth   │ │  Tasks  │ │  Wallet  │             │
│   │ Module  │ │ Module  │ │  Module  │             │
│   └────┬────┘ └────┬────┘ └─────┬────┘             │
│   ┌────┴────┐ ┌────┴────┐ ┌─────┴────┐             │
│   │  Users  │ │Referrals│ │ Payment │             │
│   │ Module  │ │ Module  │ │  Module │             │
│   └─────────┘ └─────────┘ └─────┬────┘             │
│                                  │                   │
│                            ┌─────┴────┐             │
│                            │  Prisma  │             │
│                            │  Module  │             │
│                            └─────┬────┘             │
│                                  │                   │
│   Middleware: Helmet, ThrottlerGuard, ValidationPipe │
└──────────────────────────────────┬───────────────────┘
                                   │  Prisma ORM
                                   ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Docker)                  │
│              Container: xearn-postgres               │
│              Port: 5432                              │
│                                                     │
│   Tables: users, wallets, tasks, task_completions,  │
│           transactions, withdrawals, commissions,   │
│           advertisements                            │
└─────────────────────────────────────────────────────┘
```

---

## Organisation du monorepo

```
XEARN/                          # Racine npm workspaces
├── apps/
│   ├── api/                    # Workspace: apps/api
│   └── web/                    # Workspace: apps/web
├── packages/                   # (Futur: packages partagés)
├── package.json                # Monorepo root
├── .env                        # Variables partagées
└── docker-compose.yml
```

Les deux applications partagent le même `node_modules` hoisted à la racine grâce aux **npm workspaces**. Le `.env` à la racine est lu par les deux apps (via `dotenv` côté API, `NEXT_PUBLIC_*` côté web).

---

## Backend — NestJS

### Modules

| Module | Responsabilité | Dépendances |
|--------|---------------|-------------|
| **AppModule** | Module racine, configure Helmet (CSP, HSTS), ThrottlerModule (3 paliers), CORS dynamique | Tous les modules |
| **AuthModule** | Inscription, connexion email, Google OAuth, vérification email (Nodemailer), JWT (access + refresh) | PrismaModule |
| **UsersModule** | Profil, liste admin, stats, suspension/ban | PrismaModule |
| **TasksModule** | CRUD tâches, complétion, crédit wallet | PrismaModule, ReferralsModule |
| **WalletModule** | Portefeuille, transactions, activation, retraits | PrismaModule |
| **ReferralsModule** | Arbre parrainage, commissions, stats | PrismaModule |
| **PaymentModule** | Multi-provider (Flutterwave, FedaPay, Mock), webhooks | PrismaModule |
| **PrismaModule** | Service Prisma Client (global) | — |

### Flux d'authentification

```
1. POST /api/auth/register
   → Validation DTO (class-validator)
   → Sanitisation (trim, lowercase email)
   → Hash bcrypt du mot de passe
   → Création user + wallet (transaction Prisma)
   → Envoi email de vérification (Nodemailer / Gmail SMTP)
   → Réponse: { requiresEmailVerification: true, message }

2. GET /api/auth/verify-email?token=xxx
   → Vérification du token (validité + expiration 24h)
   → Met à jour emailVerifiedAt
   → Supprime le token
   → Redirection vers /login

3. POST /api/auth/login
   → Validation DTO
   → Recherche user par email/phone
   → Vérification bcrypt
   → Vérification emailVerifiedAt (requis)
   → Génération nouveaux tokens
   → Réponse: { user, accessToken, refreshToken }

4. POST /api/auth/google
   → Reçoit { email, googleId, firstName, lastName } depuis NextAuth
   → Crée ou retrouve le user (email vérifié automatiquement)
   → Génère tokens JWT
   → Réponse: { user, accessToken, refreshToken }

5. Requêtes authentifiées
   → Header: Authorization: Bearer <accessToken>
   → JwtStrategy extrait userId du token
   → @UseGuards(JwtAuthGuard) protège les routes
   → AdminGuard vérifie role === ADMIN pour les routes admin
```

### Flux de complétion de tâche

```
POST /api/tasks/:id/complete (JWT requis)
│
├── 1. Vérification: tâche existe, active, non expirée
├── 2. Vérification: pas déjà complétée par cet user
├── 3. Transaction Prisma:
│   ├── Créer TaskCompletion
│   ├── Incrémenter completionCount de la tâche
│   ├── Créditer wallet du user (balance + totalEarned)
│   └── Créer Transaction (type: TASK_EARNING)
├── 4. Distribuer commissions (async, try/catch):
│   ├── Si user a un parrain L1 → Commission 40%
│   │   ├── Créer Commission
│   │   ├── Créditer wallet parrain L1
│   │   └── Créer Transaction (type: REFERRAL_L1)
│   └── Si parrain L1 a un parrain L2 → Commission 10%
│       ├── Créer Commission
│       ├── Créditer wallet parrain L2
│       └── Créer Transaction (type: REFERRAL_L2)
└── 5. Réponse: complétion + wallet mis à jour
```

### Sécurité

| Couche | Implémentation |
|--------|---------------|
| **Helmet** | Headers HTTP sécurisés (CSP directives, HSTS 1 an + preload, X-Frame-Options) |
| **Rate Limiting** | 3 paliers : `short` (3 req/s), `medium` (30 req/10s), `long` (100 req/min) |
| **Validation** | DTOs avec class-validator, messages d'erreur en français |
| **Sanitisation** | Trim automatique, transformation des types |
| **CORS** | Dynamique via `CORS_ORIGINS` (.env), callback de vérification, preflight cache 24h |
| **Mots de passe** | bcrypt avec salt rounds par défaut (10) |
| **Tokens** | JWT signé avec secret, expiration courte (15min access, 7j refresh) |
| **Email** | Vérification par token (24h expiration), envoi via Nodemailer/Gmail SMTP |

---

## Frontend — Next.js

### Pages

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Connexion email + Google OAuth |
| `/register` | Public | Inscription avec code parrainage optionnel + Google OAuth |
| `/verify-email` | Public | Vérification du lien email (token) |
| `/verify-email/pending` | Public | Page d'attente après inscription (renvoyer le mail) |
| `/legal/cgu` | Public | Conditions Générales d'Utilisation |
| `/legal/confidentialite` | Public | Politique de confidentialité |
| `/legal/mentions-legales` | Public | Mentions légales |
| `/dashboard` | JWT | Dashboard utilisateur principal |
| `/dashboard/tasks` | JWT | Tâches disponibles |
| `/dashboard/referrals` | JWT | Parrainage (3 onglets: L1, L2, Commissions) |
| `/dashboard/wallet` | JWT | Portefeuille et retraits |
| `/admin` | ADMIN | Dashboard admin |
| `/admin/users` | ADMIN | Gestion des utilisateurs |
| `/admin/tasks` | ADMIN | Gestion des tâches |
| `/admin/transactions` | ADMIN | Historique des transactions |

### AuthContext

Le `AuthContext` React gère l'état d'authentification global :

- Stockage des tokens dans `localStorage` (`xearn_token`, `xearn_refresh_token`)
- Synchronisation avec NextAuth (Google OAuth) via `useSession()`
- `api()` : wrapper de fetch qui injecte le header Authorization et gère le refresh automatique
- Redirection automatique vers `/login` si le token est expiré et le refresh échoue
- Chargement du profil utilisateur au montage via `GET /api/users/me`
- Déconnexion claire : logout local + `signOut()` NextAuth

### Communication API

Toutes les requêtes API passent par `api()` :

```
api(url)
├── Ajoute Authorization: Bearer <accessToken>
├── Si 401 Unauthorized:
│   ├── POST /api/auth/refresh avec refreshToken
│   ├── Si succès → met à jour tokens, retry la requête
│   └── Si échec → déconnexion, redirection /login
└── Retourne la réponse
```

---

## Base de données

### Modèles Prisma

| Modèle | Description | Relations clés |
|--------|-------------|---------------|
| **User** | Utilisateur (email, password, rôle, statut, referralCode, provider, googleId, emailVerifiedAt) | → Wallet, → TaskCompletion[], → referredBy (User), → referrals (User[]), → Commission[] |
| **Wallet** | Portefeuille (balance, totalEarned) | → User (1:1) |
| **Task** | Tâche à compléter (titre, type, récompense, statut) | → TaskCompletion[] |
| **TaskCompletion** | Complétion d'une tâche par un user (unique par user+task) | → User, → Task |
| **Transaction** | Historique financier (type, montant, statut) | → User |
| **Withdrawal** | Demande de retrait (montant, méthode, statut) | → User |
| **Commission** | Commission de parrainage (niveau, pourcentage, montant) | → beneficiary (User), → sourceUser (User) |
| **Advertisement** | Publicité (Pub Maker, futur) | — |

### Enums importants

- **UserRole** : `USER`, `ADMIN`
- **AccountStatus** : `FREE`, `ACTIVATED`, `SUSPENDED`, `BANNED`
- **AuthProvider** : `LOCAL`, `GOOGLE`
- **TaskType** : `VIDEO_AD`, `CLICK_AD`, `SURVEY`, `SPONSORED`
- **TransactionType** : `ACTIVATION`, `TASK_EARNING`, `REFERRAL_L1`, `REFERRAL_L2`, `WITHDRAWAL`, `PUB_MAKER`
- **PaymentMethod** : `FLOOZ`, `TMONEY`, `MTN_MOMO`, `ORANGE_MONEY`, `VISA`, `MASTERCARD`, `PAYPAL`

---

## Diagramme de données

```
User ──1:1──> Wallet
User ──1:N──> TaskCompletion ──N:1──> Task
User ──1:N──> Transaction
User ──1:N──> Withdrawal
User ──1:N──> Commission (en tant que bénéficiaire)
User ──1:N──> Commission (en tant que source)
User ──1:N──> User (parrainage: referredBy / referrals)
```

---

## Configuration

Toutes les valeurs métier sont configurables via `.env` :

- **Taux de parrainage** : `REFERRAL_LEVEL1_PERCENT` (40), `REFERRAL_LEVEL2_PERCENT` (10)
- **Prix d'activation** : `ACTIVATION_PRICE_FCFA` (4000)
- **Retrait minimum** : `WITHDRAWAL_MIN_FCFA` (2000)
- **Mode de paiement** : `PAYMENT_MODE` (`mock` en dev, `flutterwave` en prod)
- **CORS** : `CORS_ORIGINS` (origines autorisées, séparées par des virgules)
- **SMTP** : `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (Gmail avec mot de passe d'application)
- **Google OAuth** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Flutterwave** : `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY`, `FLW_ENCRYPTION_KEY`, `FLW_WEBHOOK_HASH`

Ces valeurs sont lues à l'exécution et ne nécessitent pas de recompilation pour être modifiées.
Voir `.env.example` pour la liste complète.
