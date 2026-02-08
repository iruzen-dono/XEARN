# XEARN

**Plateforme panafricaine de micro-revenus digitaux**

XEARN permet aux utilisateurs de gagner de l'argent (FCFA) en réalisant des micro-tâches digitales : visionnage de publicités, sondages, clics sponsorisés, etc.  
Un système de parrainage à 2 niveaux récompense les parrains à chaque tâche complétée par leurs filleuls.

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Authentification** | Inscription / connexion par email, JWT (access + refresh), rate limiting anti brute-force |
| **Tâches** | Création admin, liste paginée, complétion utilisateur, crédit automatique au wallet |
| **Portefeuille** | Solde en temps réel, historique de transactions, activation de compte (4 000 FCFA), retraits |
| **Parrainage** | 2 niveaux (Niveau 1 : 40 %, Niveau 2 : 10 %), commissions automatiques, arbre de filleuls |
| **Administration** | Dashboard admin, gestion utilisateurs (suspension/ban), statistiques globales |
| **Sécurité** | Helmet, rate limiting (@nestjs/throttler), validation DTOs, sanitisation des entrées |
| **UX Mobile** | Interface responsive, sidebars adaptatives, toasts, navigation mobile |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 · React 19 · TypeScript · TailwindCSS 3.4 · Lucide React |
| Backend | NestJS 10 · TypeScript · Prisma 6.19 |
| Base de données | PostgreSQL 16 (Docker) |
| Auth | JWT (access 15 min + refresh 7 jours) · bcrypt |
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
│   │       ├── auth/           # Authentification (JWT, register, login)
│   │       ├── users/          # Gestion des utilisateurs
│   │       ├── tasks/          # Tâches & complétions
│   │       ├── wallet/         # Portefeuille & transactions
│   │       ├── referrals/      # Parrainage & commissions
│   │       ├── prisma/         # Service Prisma
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── web/                    # Frontend Next.js
│       └── src/
│           └── app/
│               ├── login/      # Page de connexion
│               ├── register/   # Page d'inscription
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

### Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@xearn.com | admin123 |
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
| `DATABASE_URL` | `postgresql://xearn:xearn_password@localhost:5432/xearn_db` | Connexion PostgreSQL |
| `JWT_SECRET` | `dev-jwt-secret-xearn-2026` | Clé secrète JWT |
| `JWT_REFRESH_SECRET` | `dev-jwt-refresh-secret-xearn-2026` | Clé secrète refresh token |
| `JWT_EXPIRATION` | `15m` | Durée du token d'accès |
| `JWT_REFRESH_EXPIRATION` | `7d` | Durée du refresh token |
| `API_PORT` | `4000` | Port de l'API |
| `PAYMENT_MODE` | `mock` | Mode de paiement (`mock` / `live`) |
| `ACTIVATION_PRICE_FCFA` | `4000` | Prix d'activation du compte |
| `WITHDRAWAL_MIN_FCFA` | `2000` | Montant minimum de retrait |
| `REFERRAL_LEVEL1_PERCENT` | `40` | Commission parrainage niveau 1 |
| `REFERRAL_LEVEL2_PERCENT` | `10` | Commission parrainage niveau 2 |

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
- [x] Authentification JWT
- [x] Système de tâches
- [x] Portefeuille & transactions
- [x] Parrainage 2 niveaux
- [x] Dashboard admin
- [x] Sécurité (Helmet, rate limiting, validation)
- [x] UX Mobile + Toasts
- [ ] Paiements réels (MTN MoMo, Orange Money, Flooz)
- [ ] Analytics avancés
- [ ] Tests automatisés (Jest, Playwright)
- [ ] Déploiement production
- [ ] Application mobile

---

## Licence

Projet privé — Tous droits réservés.
