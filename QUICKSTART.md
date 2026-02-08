# Quickstart — XEARN

Guide pas à pas pour installer et lancer XEARN sur Windows.

---

## 1. Prérequis

Avant de commencer, vérifie que tu as installé :

| Outil | Version minimale | Vérification | Téléchargement |
|-------|------------------|-------------|----------------|
| **Node.js** | 22+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 10+ | `npm --version` | Installé avec Node.js |
| **Docker Desktop** | 4.x | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | 2.x | `git --version` | [git-scm.com](https://git-scm.com/) |

> **Important** : Docker Desktop doit être **lancé et en cours d'exécution** (icône verte dans la barre des tâches).

---

## 2. Cloner le projet

```bash
git clone https://github.com/iruzen-dono/XEARN.git
cd XEARN
```

---

## 3. Installer les dépendances

```bash
npm install
```

> Cette commande installe les dépendances de **tout le monorepo** (API + Web) d'un coup grâce aux npm workspaces.  
> Si tu vois des warnings `WARN`, c'est normal — seules les `ERR!` sont des erreurs.

---

## 4. Lancer PostgreSQL

```bash
docker compose up -d
```

Vérifie que le conteneur tourne :

```bash
docker ps
```

Tu devrais voir `xearn-postgres` avec le statut `Up`.

> **Si ça ne marche pas** : vérifie que Docker Desktop est bien lancé. L'icône dans la barre des tâches doit être verte.

---

## 5. Initialiser la base de données

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

**Charger les données de test** (optionnel mais recommandé) :

```bash
npx ts-node prisma/seed.ts
```

Retourne à la racine :

```bash
cd ../..
```

> **Prisma Studio** : pour explorer visuellement la BDD, lance `npx prisma studio` depuis `apps/api`. Ça ouvre un navigateur sur http://localhost:5555.

---

## 6. Lancer le projet

### Option A : Double-clic (la plus simple)

Double-clique sur **`start.bat`** à la racine du projet.  
Le script lance automatiquement Docker, la BDD, l'API et le frontend.

### Option B : PowerShell

```powershell
.\start.ps1
```

### Option C : Lancer manuellement

**Terminal 1** — API :
```bash
cd apps/api
npx tsc --project tsconfig.json
node dist/main.js
```

**Terminal 2** — Frontend :
```bash
cd apps/web
npx next dev --port 3000
```

---

## 7. Tester

Ouvre ton navigateur :

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:4000/api |

### Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| **Admin** | admin@xearn.com | admin123 |
| **Utilisateur** | test@xearn.com | test123 |

### Test rapide de l'API

```powershell
# Login admin
$r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@xearn.com","password":"admin123"}'

Write-Host "Connecté : $($r.user.firstName) $($r.user.lastName) ($($r.user.role))"
```

---

## 8. Arrêter le projet

### Si lancé via start.bat :

```bash
start.bat stop
```

### Si lancé via PowerShell :

```powershell
.\start.ps1 -Stop
```

### Manuellement :

```bash
# Arrêter les processus Node
taskkill /IM node.exe /F

# Arrêter PostgreSQL
docker stop xearn-postgres
```

---

## Récapitulatif des commandes

| Action | Commande |
|--------|----------|
| Tout lancer | `start.bat` |
| API seule | `start.bat api` |
| Web seul | `start.bat web` |
| Tout arrêter | `start.bat stop` |
| Explorer la BDD | `cd apps/api && npx prisma studio` |
| Réinitialiser les données | `cd apps/api && npx ts-node prisma/seed.ts` |
| Compiler l'API manuellement | `cd apps/api && npx tsc --project tsconfig.json` |
| Lancer l'API manuellement | `cd apps/api && node dist/main.js` |
| Lancer le frontend manuellement | `cd apps/web && npx next dev --port 3000` |

---

## Résolution de problèmes

### "Docker Desktop n'est pas démarré"
→ Lance Docker Desktop et attends qu'il soit prêt (icône verte).

### "Le port 4000 est déjà utilisé"
→ Un autre processus utilise le port. Lance `start.bat stop` ou `taskkill /IM node.exe /F`.

### "Cannot find module" à la compilation
→ Relance `npm install` à la racine du projet.

### "Prisma Client not generated"
→ Lance `cd apps/api && npx prisma generate`.

### "La BDD est vide / pas de comptes"
→ Lance le seed : `cd apps/api && npx ts-node prisma/seed.ts`.

### Le frontend affiche une page blanche
→ Vérifie que l'API tourne bien sur le port 4000. Ouvre http://localhost:4000/api dans le navigateur.

### "ECONNREFUSED" dans les logs API
→ PostgreSQL n'est pas lancé. Vérifie avec `docker ps` et relance si besoin : `docker start xearn-postgres`.

---

## Prochaines étapes

Une fois le projet démarré, explore :

1. **Le dashboard utilisateur** : http://localhost:3000/dashboard
2. **Le dashboard admin** : http://localhost:3000/admin (connecté en admin@xearn.com)
3. **L'arbre de parrainage** : http://localhost:3000/dashboard/referrals
4. **La documentation API** : [docs/API.md](docs/API.md)
5. **L'architecture** : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
