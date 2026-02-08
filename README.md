# 🚀 XEARN - Plateforme de micro-revenus digitaux

## Stack technique
- **Frontend** : Next.js 15 + React 19 + TailwindCSS
- **Backend** : NestJS + Prisma ORM
- **Base de données** : PostgreSQL
- **Auth** : JWT (access + refresh tokens)

## Structure du projet
```
XEARN/
├── apps/
│   ├── web/           # Frontend Next.js
│   │   └── src/app/   # Pages (App Router)
│   └── api/           # Backend NestJS
│       ├── src/       # Source code
│       └── prisma/    # Schema & migrations
├── docker-compose.yml # PostgreSQL
├── .env               # Variables d'environnement
└── package.json       # Monorepo (npm workspaces)
```

## Prérequis
- Node.js >= 18
- Docker (pour PostgreSQL)
- npm

## Installation

### 1. Cloner et installer les dépendances
```bash
npm install
```

### 2. Lancer PostgreSQL
```bash
docker-compose up -d
```

### 3. Configurer les variables d'environnement
Le fichier `.env` est déjà configuré pour le développement local.

### 4. Créer la base de données
```bash
npm run db:generate
npm run db:migrate
```

### 5. Lancer le projet
```bash
npm run dev
```

Cela lance en parallèle :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:4000

## Scripts utiles
| Commande | Description |
|---|---|
| `npm run dev` | Lance front + back en parallèle |
| `npm run dev:web` | Lance uniquement le frontend |
| `npm run dev:api` | Lance uniquement l'API |
| `npm run db:migrate` | Appliquer les migrations Prisma |
| `npm run db:studio` | Ouvrir Prisma Studio (GUI DB) |
| `npm run build` | Build de production |

## API Endpoints

### Auth
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `POST /api/auth/refresh` — Rafraîchir le token

### Users
- `GET /api/users/me` — Profil utilisateur
- `GET /api/users` — Liste (admin)
- `GET /api/users/stats` — Stats (admin)

### Tasks
- `GET /api/tasks` — Liste des tâches
- `POST /api/tasks/:id/complete` — Compléter une tâche
- `GET /api/tasks/my-completions` — Mes complétions

### Wallet
- `GET /api/wallet` — Mon portefeuille
- `GET /api/wallet/transactions` — Historique
- `POST /api/wallet/activate` — Activer le compte
- `POST /api/wallet/withdraw` — Demander un retrait

### Referrals
- `GET /api/referrals/tree` — Mon arbre de parrainage
- `GET /api/referrals/commissions` — Mes commissions
- `GET /api/referrals/stats` — Stats parrainage
