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
│   ┌─────────┐                    │                   │
│   │   Ads   │              ┌─────┴────┐             │
│   │ Module  │              │  Prisma  │             │
│   └─────────┘              │  Module  │             │
│                            └─────┬────┘             │
│                                  │                   │
│   Middleware: Helmet, ThrottlerGuard, ValidationPipe,│
│            SanitizeInterceptor, CSRF Guard            │
└──────────────────────────────────┬───────────────────┘
                                   │  Prisma ORM
                                   ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Docker)                  │
│              Container: xearn-postgres               │
│              Port: 5432                              │
│                                                     │
│   Tables: users, wallets, tasks, task_completions,  │
│           task_sessions, transactions, withdrawals,  │
│           commissions, advertisements,               │
│           notifications                              │
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
| **AppModule** | Module racine, configure Helmet (CSP, HSTS), ThrottlerModule (3 paliers), CORS dynamique, **health check (503 si DB down)** | Tous les modules |
| **AuthModule** | Inscription, connexion email, Google OAuth (idToken vérifié côté serveur), vérification email (Nodemailer), JWT (access + refresh), **tokenVersion** pour invalidation des tokens, CSRF double-submit | PrismaModule |
| **UsersModule** | Profil, liste admin, stats, suspension/ban | PrismaModule |
| **TasksModule** | CRUD tâches, complétion, crédit wallet, **filtrage par tier**, **vérification expiration côté serveur**, **pagination des complétions** | PrismaModule, ReferralsModule |
| **WalletModule** | Portefeuille, transactions, activation, retraits avec **frais par tier** (10%/5%/2%), **upgrade de tier**, **protection race condition** (SELECT FOR UPDATE), **pagination des retraits** | PrismaModule |
| **ReferralsModule** | Arbre parrainage **3 niveaux**, commissions (L1: 40%, **L2: 10% PREMIUM+**, **L3 VIP: 5%**), stats | PrismaModule |
| **AdsModule** | CRUD publicités, **rôle Partenaire** (Pub Maker), **ciblage par pays et tier**, budget, approbation admin | PrismaModule |
| **PaymentModule** | Multi-provider (FedaPay recommandé, Mock), webhooks, **idempotence des webhooks** | PrismaModule |
| **NotificationsModule** | Notifications utilisateur (tâches, commissions, retraits), compteur non-lues, **SSE avec nettoyage propre** | PrismaModule |
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
   → Génération nouveaux tokens (incluant tokenVersion dans le payload)
   → Réponse: { user, accessToken, refreshToken }

4. POST /api/auth/google
   → Reçoit { email, googleId, firstName, lastName } depuis NextAuth
   → Crée ou retrouve le user (email vérifié automatiquement)
   → Si le compte existant a un mot de passe (LOCAL), préserve le provider LOCAL
   → Génère tokens JWT
   → Réponse: { user, accessToken, refreshToken }

5. POST /api/auth/refresh
   → Vérifie le refresh token (signature + expiration)
   → **Vérifie tokenVersion** : compare payload.tokenVersion avec user.tokenVersion en BDD
   → Si divergence (password changé, reset) → 401 Unauthorized
   → Génère de nouveaux tokens

6. Requêtes authentifiées
   → Header: Authorization: Bearer <accessToken>
   → JwtStrategy extrait userId du token
   → @UseGuards(JwtAuthGuard) protège les routes
   → AdminGuard vérifie role === ADMIN pour les routes admin
```

### Flux de complétion de tâche

```
POST /api/tasks/:id/complete (JWT requis)
│
├── 1. Vérification: tâche existe, active
├── 2. Vérification: **tâche non expirée** (task.expiresAt vérifié côté serveur)
├── 3. Vérification: compte activé
├── 4. Vérification: **tier suffisant** (user.tier >= task.requiredTier)
├── 5. Vérification: pas déjà complétée par cet user
├── 6. Vérification anti-triche: session démarrée + temps minimum
├── 7. Transaction Prisma:
│   ├── Créer TaskCompletion
│   ├── Incrémenter completionCount de la tâche
│   ├── Créditer wallet du user (balance + totalEarned)
│   └── Créer Transaction (type: TASK_EARNING)
├── 8. Distribuer commissions (async, try/catch):
│   ├── Si user a un parrain L1 → Commission 40%
│   │   ├── Créer Commission
│   │   ├── Créditer wallet parrain L1
│   │   └── Créer Transaction (type: REFERRAL_L1)
│   ├── Si parrain L1 a un parrain L2 **ET L2 est PREMIUM ou VIP** → Commission 10%
│   │   ├── Créer Commission
│   │   ├── Créditer wallet parrain L2
│   │   └── Créer Transaction (type: REFERRAL_L2)
│   └── **Si parrain L2 a un parrain L3 ET L3 est VIP** → Commission 5%
│       ├── Créer Commission
│       ├── Créditer wallet parrain L3
│       └── Créer Transaction (type: REFERRAL_L3)
└── 9. Réponse: complétion + wallet mis à jour
```

### Sécurité

| Couche | Implémentation |
|--------|---------------|
| **Helmet** | Headers HTTP sécurisés (CSP directives, HSTS 1 an + preload, X-Frame-Options) |
| **Headers frontend** | CSP strict, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (camera, microphone, geolocation, payment désactivés) via `next.config.js` |
| **Rate Limiting** | 3 paliers : `short` (3 req/s), `medium` (30 req/10s), `long` (100 req/min) |
| **Validation** | DTOs avec class-validator, `enableImplicitConversion` désactivé pour empêcher la coercion de types |
| **Sanitisation** | `SanitizeInterceptor` avec limite de profondeur (MAX_DEPTH=16) pour prévenir les stack overflows |
| **CORS** | Dynamique via `CORS_ORIGINS` (.env), callback de vérification, preflight cache 24h |
| **CSRF** | Double-submit cookie pattern, token vérifié sur les requêtes mutantes (POST, PATCH, DELETE) |
| **Mots de passe** | bcrypt avec salt rounds = 12 (register, changePassword, resetPassword) |
| **Tokens** | JWT signé avec secret, expiration courte (15min access, 7j refresh), **tokenVersion** validé au refresh pour permettre l'invalidation des tokens |
| **Wallet** | `SELECT ... FOR UPDATE` dans une transaction interactive pour prévenir les race conditions sur les retraits |
| **Webhooks** | Vérification HMAC FedaPay + contrôle d'idempotence (un retrait `COMPLETED` ne peut pas être retraité) |
| **Service Worker** | Exclut les chemins `/dashboard` et `/admin` du cache pour empêcher l'accès hors-ligne aux données sensibles |
| **Google Auth** | Vérification serveur du `idToken` via `google-auth-library`, ne modifie pas le provider d'un compte LOCAL existant |
| **Email** | Vérification par token (24h expiration), envoi via Nodemailer/Gmail SMTP |
| **Accessibilité** | Attributs ARIA (aria-expanded, aria-haspopup, role=menu), gestion clavier (Escape), autoComplete sur les formulaires |

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
| `/dashboard/referrals` | JWT | Parrainage (3 onglets: L1, L2, **L3 pour VIP**, Commissions) |
| `/dashboard/wallet` | JWT | Portefeuille, retraits, **upgrade de tier** |
| `/admin` | ADMIN | Dashboard admin |
| `/admin/users` | ADMIN | Gestion des utilisateurs |
| `/admin/tasks` | ADMIN | Gestion des tâches |
| `/admin/transactions` | ADMIN | Historique des transactions |

### AuthContext

Le `AuthContext` React gère l'état d'authentification global :

- Auth basée sur cookies httpOnly (access + refresh)
- Synchronisation avec NextAuth (Google OAuth) via `useSession()`
- `api()` : wrapper de fetch qui envoie le cookie et applique CSRF sur les requêtes mutantes
- Refresh automatique via `POST /api/auth/refresh` (cookie refresh)
- Chargement du profil utilisateur au montage via `GET /api/users/me`
- Déconnexion : `POST /api/auth/logout` + `signOut()` NextAuth

### Communication API

Toutes les requêtes API passent par `api()` :

```
api(url)
├── Envoie les cookies d'authentification
├── Ajoute X-CSRF-Token sur les requêtes mutantes
├── Si 401 Unauthorized:
│   ├── POST /api/auth/refresh (cookie refresh)
│   ├── Si succès → retry la requête
│   └── Si échec → déconnexion, redirection /login
└── Retourne la réponse
```

---

## Base de données

### Modèles Prisma

| Modèle | Description | Relations clés |
|--------|-------------|---------------|
| **User** | Utilisateur (email, password, rôle, statut, **tier**, referralCode, provider, googleId, emailVerifiedAt) | → Wallet, → TaskCompletion[], → referredBy (User), → referrals (User[]), → Commission[] |
| **Wallet** | Portefeuille (balance, totalEarned) | → User (1:1) |
| **Task** | Tâche à compléter (titre, type, récompense, statut, **requiredTier**) | → TaskCompletion[] |
| **TaskCompletion** | Complétion d'une tâche par un user (unique par user+task) | → User, → Task |
| **TaskSession** | Session de démarrage d'une tâche (anti-triche, temps minimum) | → User, → Task |
| **Transaction** | Historique financier (type, montant, statut) | → User |
| **Withdrawal** | Demande de retrait (montant, méthode, statut, **frais calculés par tier**) | → User |
| **Commission** | Commission de parrainage (niveau 1/2/3, pourcentage, montant) | → beneficiary (User), → sourceUser (User) |
| **Advertisement** | Publicité (publisher, ciblage, **targetCountries[]**, **targetTiers[]**, **budget/spent**) | → User (publisher) |
| **Notification** | Notification utilisateur (type, titre, message, lu/non-lu) | → User |

### Enums importants

- **UserRole** : `USER`, `PARTNER`, `ADMIN`
- **AccountTier** : `NORMAL`, `PREMIUM`, `VIP`
- **AccountStatus** : `FREE`, `ACTIVATED`, `SUSPENDED`, `BANNED`
- **AuthProvider** : `LOCAL`, `GOOGLE`
- **TaskType** : `VIDEO_AD`, `CLICK_AD`, `SURVEY`, `SPONSORED`
- **TransactionType** : `ACTIVATION`, `TASK_EARNING`, `REFERRAL_L1`, `REFERRAL_L2`, `REFERRAL_L3`, `WITHDRAWAL`, `PUB_MAKER`, `TIER_UPGRADE`
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

- **Taux de parrainage** : `REFERRAL_LEVEL1_PERCENT` (40), `REFERRAL_LEVEL2_PERCENT` (10), `REFERRAL_LEVEL3_PERCENT` (5, VIP seulement)
- **Prix d'activation** : `ACTIVATION_PRICE_FCFA` (4000)
- **Prix d'upgrade** : `PREMIUM_PRICE_FCFA` (10000), `VIP_PRICE_FCFA` (25000)
- **Retrait minimum** : `WITHDRAWAL_MIN_FCFA` (2000)
- **Mode de paiement** : `PAYMENT_MODE` (`mock` en dev, `fedapay` en prod)
- **CORS** : `CORS_ORIGINS` (origines autorisées, séparées par des virgules)
- **SMTP** : `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (Gmail avec mot de passe d'application)
- **Google OAuth** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **FedaPay** : `FEDAPAY_SECRET_KEY`, `FEDAPAY_PUBLIC_KEY`, `FEDAPAY_WEBHOOK_SECRET`

Ces valeurs sont lues à l'exécution et ne nécessitent pas de recompilation pour être modifiées.
Voir `.env.example` pour la liste complète.
