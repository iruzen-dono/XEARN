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
│   ├── AuthContext (JWT)                             │
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
│   │  Users  │ │Referrals│ │  Prisma  │             │
│   │ Module  │ │ Module  │ │  Module  │             │
│   └─────────┘ └─────────┘ └─────┬────┘             │
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
| **AppModule** | Module racine, configure Helmet, ThrottlerModule (60 req/min global) | Tous les modules |
| **AuthModule** | Inscription, connexion, JWT (access + refresh), JwtStrategy | PrismaModule |
| **UsersModule** | Profil, liste admin, stats, suspension/ban | PrismaModule |
| **TasksModule** | CRUD tâches, complétion, crédit wallet | PrismaModule, ReferralsModule |
| **WalletModule** | Portefeuille, transactions, activation, retraits | PrismaModule |
| **ReferralsModule** | Arbre parrainage, commissions, stats | PrismaModule |
| **PrismaModule** | Service Prisma Client (global) | — |

### Flux d'authentification

```
1. POST /api/auth/register
   → Validation DTO (class-validator)
   → Sanitisation (trim, lowercase email)
   → Hash bcrypt du mot de passe
   → Création user + wallet (transaction Prisma)
   → Génération tokens JWT (access 15min + refresh 7j)
   → Réponse: { user, accessToken, refreshToken }

2. POST /api/auth/login
   → Validation DTO
   → Recherche user par email/phone
   → Vérification bcrypt
   → Génération nouveaux tokens
   → Réponse: { user, accessToken, refreshToken }

3. Requêtes authentifiées
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
| **Helmet** | Headers HTTP sécurisés (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate Limiting** | 60 req/min global, limites personnalisées par route (login: 10/min, register: 5/min) |
| **Validation** | DTOs avec class-validator, messages d'erreur en français |
| **Sanitisation** | Trim automatique, transformation des types |
| **CORS** | Configuré pour `http://localhost:3000` |
| **Mots de passe** | bcrypt avec salt rounds par défaut (10) |
| **Tokens** | JWT signé avec secret, expiration courte (15min access) |

---

## Frontend — Next.js

### Pages

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Connexion email/mot de passe |
| `/register` | Public | Inscription avec code parrainage optionnel |
| `/dashboard` | JWT | Dashboard utilisateur principal |
| `/dashboard/referrals` | JWT | Parrainage (3 onglets: L1, L2, Commissions) |
| `/admin` | ADMIN | Dashboard admin |
| `/admin/users` | ADMIN | Gestion des utilisateurs |
| `/admin/tasks` | ADMIN | Gestion des tâches |

### AuthContext

Le `AuthContext` React gère l'état d'authentification global :

- Stockage des tokens dans `localStorage` (`xearn_token`, `xearn_refresh_token`)
- `authFetch()` : wrapper de fetch qui injecte le header Authorization et gère le refresh automatique
- Redirection automatique vers `/login` si le token est expiré et le refresh échoue
- Chargement du profil utilisateur au montage via `GET /api/users/me`

### Communication API

Toutes les requêtes API passent par `authFetch()` :

```
authFetch(url)
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
| **User** | Utilisateur (email, password, rôle, statut, referralCode) | → Wallet, → TaskCompletion[], → referredBy (User), → referrals (User[]), → Commission[] |
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
- **Mode de paiement** : `PAYMENT_MODE` (`mock` en dev, `live` en prod)

Ces valeurs sont lues à l'exécution et ne nécessitent pas de recompilation pour être modifiées.
