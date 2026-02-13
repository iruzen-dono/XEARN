# XEARN

**Plateforme panafricaine de micro-revenus digitaux**

XEARN permet aux utilisateurs de gagner de l'argent (FCFA) en réalisant des micro-tâches digitales : visionnage de publicités, sondages, clics sponsorisés, etc.  
Un système de parrainage à 2 niveaux récompense les parrains à chaque tâche complétée par leurs filleuls.

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Authentification** | Email + Google OAuth (NextAuth v4), vérification email, JWT (access + refresh), rate limiting anti brute-force |
| **Tâches** | Création admin, liste paginée, complétion utilisateur, crédit automatique au wallet |
| **Portefeuille** | Solde en temps réel, historique de transactions, activation de compte (4 000 FCFA), retraits |
| **Parrainage** | 2 niveaux (Niveau 1 : 40 %, Niveau 2 : 10 %), commissions automatiques, arbre de filleuls |
| **Paiements** | Multi-provider (FedaPay recommandé, Mock dev), webhooks, Mobile Money |
| **Administration** | Dashboard admin, gestion utilisateurs (suspension/ban), statistiques globales |
| **Sécurité** | Helmet (CSP, HSTS), rate limiting 3 paliers, CORS dynamique, validation DTOs |
| **Pages légales** | CGU, Politique de confidentialité, Mentions légales |
| **UX Mobile** | Interface responsive, sidebars adaptatives, toasts, navigation mobile |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 · React 19 · TypeScript · TailwindCSS 3.4 · Lucide React · NextAuth v4 |
| Backend | NestJS 10 · TypeScript · Prisma 6.19 · Nodemailer |
| Base de données | PostgreSQL 16 (Docker) |
| Auth | JWT (access 15 min + refresh 7 jours) · bcrypt · Google OAuth |
| Paiements | FedaPay (production) · Mock (dev) |
| Monorepo | npm workspaces |
| Runtime | Node.js 22+ |

---

## Structure du projet

```
XEARN/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schéma de la BDD
│   │   │   └── seed.ts         # Données de test
│   │   └── src/
│   │       ├── auth/           # Auth (JWT, Google OAuth, email verification)
│   │       ├── users/          # Gestion des utilisateurs
│   │       ├── tasks/          # Tâches & complétions
│   │       ├── wallet/         # Portefeuille & transactions
│   │       ├── referrals/      # Parrainage & commissions
│   │       ├── payment/        # Paiements (FedaPay, Mock)
│   │       ├── prisma/         # Service Prisma
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── web/                    # Frontend Next.js
│       └── src/
│           └── app/
│               ├── api/auth/   # NextAuth (Google OAuth)
│               ├── login/      # Page de connexion
│               ├── register/   # Page d'inscription
│               ├── verify-email/ # Vérification email
│               ├── legal/      # CGU, Confidentialité, Mentions légales
│               ├── dashboard/  # Dashboard utilisateur
│               │   ├── referrals/  # Page parrainage (3 onglets)
│               │   └── ...
│               └── admin/      # Dashboard admin
├── .env                        # Variables d'environnement
├── docker-compose.yml          # PostgreSQL 16
├── start.bat                   # Script de lancement Windows
├── start.ps1                   # Script de lancement PowerShell
└── package.json                # Monorepo npm workspaces
```

---

## Prérequis

- **Node.js** 22+ et **npm** 10+
- **Docker Desktop** (pour PostgreSQL)
- **Git**

---

## Démarrage rapide

> Voir [QUICKSTART.md](QUICKSTART.md) pour le guide détaillé pas à pas.

```bash
# 1. Cloner le projet
git clone https://github.com/iruzen-dono/XEARN.git
cd XEARN

# 2. Installer les dépendances
npm install

# 3. Lancer PostgreSQL
docker compose up -d

# 4. Initialiser la base de données
cd apps/api
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
cd ../..

# 5. Tout lancer d'un coup
start.bat
```

Ou avec PowerShell :

```powershell
.\start.ps1
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| Prisma Studio | `npx prisma studio` (dans `apps/api`) |

### Comptes de test (seed)

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | juleszhou00@gmail.com | admin123 |
| Utilisateur | test@xearn.com | test123 |

---

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — Guide de démarrage rapide pas à pas
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Architecture technique détaillée
- [docs/API.md](docs/API.md) — Référence complète de l'API (22 endpoints)

---

## Scripts utiles

```bash
# Lancement complet
start.bat                  # ou .\start.ps1

# API uniquement
start.bat api              # ou .\start.ps1 -ApiOnly

# Frontend uniquement
start.bat web              # ou .\start.ps1 -WebOnly

# Arrêter tout
start.bat stop             # ou .\start.ps1 -Stop

# Prisma Studio (explorer la BDD)
cd apps/api && npx prisma studio

# Seed (réinitialiser les données de test)
cd apps/api && npx ts-node prisma/seed.ts
```

---

## Variables d'environnement

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `DATABASE_URL` | `postgresql://xearn:...@localhost:5432/xearn_db` | Connexion PostgreSQL |
| `JWT_SECRET` | — | Clé secrète JWT |
| `JWT_REFRESH_SECRET` | — | Clé secrète refresh token |
| `JWT_EXPIRATION` | `15m` | Durée du token d'accès |
| `JWT_REFRESH_EXPIRATION` | `7d` | Durée du refresh token |
| `API_PORT` | `4000` | Port de l'API |
| `CORS_ORIGINS` | `http://localhost:3000` | Origines CORS autorisées |
| `GOOGLE_CLIENT_ID` | — | ID client Google OAuth |
| `GOOGLE_CLIENT_SECRET` | — | Secret client Google OAuth |
| `NEXTAUTH_URL` | `http://localhost:3000` | URL NextAuth |
| `NEXTAUTH_SECRET` | — | Secret NextAuth |
| `SMTP_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `SMTP_USER` / `SMTP_PASS` | — | Identifiants SMTP (Gmail app password) |
| `PAYMENT_MODE` | `fedapay` | Mode de paiement (`mock` / `fedapay`) |
| `ACTIVATION_PRICE_FCFA` | `4000` | Prix d'activation du compte |
| `WITHDRAWAL_MIN_FCFA` | `2000` | Montant minimum de retrait |
| `REFERRAL_LEVEL1_PERCENT` | `40` | Commission parrainage niveau 1 |
| `REFERRAL_LEVEL2_PERCENT` | `10` | Commission parrainage niveau 2 |

> Voir [.env.example](.env.example) pour la liste complète des variables.

---

## Système de parrainage

```
Parrain (Niveau 0)
├── Filleul A (Niveau 1) ──── Parrain reçoit 40% des gains de A
│   └── Filleul C (Niveau 2) ── Parrain reçoit 10% des gains de C
└── Filleul B (Niveau 1) ──── Parrain reçoit 40% des gains de B
```

Lorsqu'un filleul complète une tâche :
1. Le filleul reçoit la récompense complète dans son wallet
2. Le parrain de niveau 1 reçoit automatiquement **40%** en commission
3. Le parrain de niveau 2 (s'il existe) reçoit automatiquement **10%** en commission

---

## Roadmap

- [x] Monorepo + Infrastructure
- [x] Authentification JWT + Google OAuth
- [x] Vérification email (Nodemailer + Gmail SMTP)
- [x] Système de tâches
- [x] Portefeuille & transactions
- [x] Parrainage 2 niveaux
- [x] Dashboard admin
- [x] Sécurité (Helmet CSP/HSTS, rate limiting 3 paliers, CORS dynamique)
- [x] UX Mobile + Toasts
- [x] Pages légales (CGU, Confidentialité, Mentions légales)
- [x] Paiements FedaPay (Mobile Money)
- [ ] Analytics avancés
- [ ] Tests automatisés (Jest, Playwright)
- [ ] Déploiement production (Vercel + Railway)
- [ ] Application mobile

---

## Licence

Projet privé — Tous droits réservés.
