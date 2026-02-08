# Référence API — XEARN

Base URL : `http://localhost:4000/api`

Toutes les réponses sont en JSON. Les routes protégées nécessitent le header :

```
Authorization: Bearer <accessToken>
```

---

## Table des matières

- [Auth](#auth)
- [Users](#users)
- [Tasks](#tasks)
- [Wallet](#wallet)
- [Referrals](#referrals)
- [Codes d'erreur](#codes-derreur)

---

## Auth

### POST `/api/auth/register`

Inscription d'un nouvel utilisateur.

**Rate limit** : 5 requêtes / minute

**Body** :

```json
{
  "email": "user@example.com",
  "password": "monmotdepasse",
  "firstName": "Amadou",
  "lastName": "Diallo",
  "referralCode": "clxyz123..."
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `email` | string | Oui* | Format email valide |
| `phone` | string | Oui* | Format `+22890123456` (8 à 15 chiffres) |
| `password` | string | Oui | 6 à 128 caractères |
| `firstName` | string | Oui | 1 à 50 caractères |
| `lastName` | string | Oui | 1 à 50 caractères |
| `referralCode` | string | Non | Max 50 caractères |

\* Au moins `email` ou `phone` doit être fourni.

**Réponse 201** :

```json
{
  "user": {
    "id": "clxyz...",
    "email": "user@example.com",
    "firstName": "Amadou",
    "lastName": "Diallo",
    "role": "USER",
    "status": "FREE",
    "referralCode": "clabc..."
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Erreurs** :
- `400` — Validation échouée (champs manquants ou invalides)
- `409` — Email ou téléphone déjà utilisé

---

### POST `/api/auth/login`

Connexion par email ou téléphone.

**Rate limit** : 10 requêtes / minute

**Body** :

```json
{
  "email": "user@example.com",
  "password": "monmotdepasse"
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `email` | string | Oui* | Format email |
| `phone` | string | Oui* | Format téléphone |
| `password` | string | Oui | 1 à 128 caractères |

\* Au moins `email` ou `phone` doit être fourni.

**Réponse 200** :

```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Erreurs** :
- `401` — Email/téléphone ou mot de passe incorrect
- `403` — Compte suspendu ou banni

---

### POST `/api/auth/refresh`

Renouvellement du token d'accès.

**Rate limit** : 15 requêtes / minute

**Body** :

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Réponse 200** :

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Erreurs** :
- `401` — Refresh token invalide ou expiré

---

## Users

### GET `/api/users/me`

Profil de l'utilisateur connecté.

**Auth** : JWT

**Réponse 200** :

```json
{
  "id": "clxyz...",
  "email": "user@example.com",
  "firstName": "Amadou",
  "lastName": "Diallo",
  "role": "USER",
  "status": "FREE",
  "referralCode": "clabc...",
  "wallet": {
    "balance": "150.00",
    "totalEarned": "350.00"
  },
  "createdAt": "2026-02-08T..."
}
```

---

### GET `/api/users?page=1&limit=20`

Liste paginée de tous les utilisateurs.

**Auth** : ADMIN

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 20 | Éléments par page |

**Réponse 200** :

```json
{
  "users": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/users/stats`

Statistiques globales des utilisateurs.

**Auth** : ADMIN

**Réponse 200** :

```json
{
  "totalUsers": 42,
  "activatedUsers": 15,
  "freeUsers": 25,
  "suspendedUsers": 2,
  "newUsersToday": 3
}
```

---

### PATCH `/api/users/:id/suspend`

Suspendre un utilisateur.

**Auth** : ADMIN

**Réponse 200** : Utilisateur mis à jour avec `status: "SUSPENDED"`

---

### PATCH `/api/users/:id/ban`

Bannir un utilisateur.

**Auth** : ADMIN

**Réponse 200** : Utilisateur mis à jour avec `status: "BANNED"`

---

## Tasks

### GET `/api/tasks?page=1&limit=20`

Liste paginée des tâches disponibles (actives, non expirées).

**Auth** : JWT

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 20 | Éléments par page |

**Réponse 200** :

```json
{
  "tasks": [
    {
      "id": "clxyz...",
      "title": "Regarder la pub Samsung",
      "type": "VIDEO_AD",
      "reward": "100.00",
      "status": "ACTIVE"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/tasks/my-completions`

Tâches complétées par l'utilisateur connecté.

**Auth** : JWT

**Réponse 200** :

```json
[
  {
    "id": "clxyz...",
    "taskId": "clxyz...",
    "earned": "100.00",
    "createdAt": "2026-02-08T...",
    "task": {
      "title": "Regarder la pub Samsung",
      "type": "VIDEO_AD"
    }
  }
]
```

---

### POST `/api/tasks/:id/complete`

Marquer une tâche comme complétée. Crédite le wallet et distribue les commissions de parrainage.

**Auth** : JWT  
**Rate limit** : 20 requêtes / minute

**Réponse 201** :

```json
{
  "completion": {
    "id": "clxyz...",
    "earned": "100.00"
  },
  "wallet": {
    "balance": "250.00",
    "totalEarned": "450.00"
  }
}
```

**Erreurs** :
- `404` — Tâche introuvable
- `400` — Tâche déjà complétée, inactive, ou expirée

---

### GET `/api/tasks/admin/all?page=1&limit=20`

Liste admin de toutes les tâches (tous statuts).

**Auth** : ADMIN

---

### POST `/api/tasks/admin/create`

Créer une nouvelle tâche.

**Auth** : ADMIN

**Body** :

```json
{
  "title": "Regarder la pub Samsung",
  "description": "Visionnez la vidéo complète (30s)",
  "type": "VIDEO_AD",
  "reward": 100,
  "maxCompletions": 500
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `title` | string | Oui | Max 200 caractères |
| `description` | string | Non | Max 1000 caractères |
| `type` | enum | Oui | `VIDEO_AD`, `CLICK_AD`, `SURVEY`, `SPONSORED` |
| `reward` | number | Oui | 1 à 100 000 FCFA |
| `url` | string | Non | URL valide |
| `maxCompletions` | number | Non | 1 à 1 000 000 |

**Réponse 201** : La tâche créée

---

## Wallet

### GET `/api/wallet`

Portefeuille de l'utilisateur connecté.

**Auth** : JWT

**Réponse 200** :

```json
{
  "id": "clxyz...",
  "balance": "250.00",
  "totalEarned": "450.00"
}
```

---

### GET `/api/wallet/transactions?page=1&limit=20`

Historique paginé des transactions.

**Auth** : JWT

**Réponse 200** :

```json
{
  "transactions": [
    {
      "id": "clxyz...",
      "type": "TASK_EARNING",
      "amount": "100.00",
      "status": "COMPLETED",
      "description": "Gain tâche: Regarder la pub Samsung",
      "createdAt": "2026-02-08T..."
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### POST `/api/wallet/activate`

Activer le compte (passage de FREE → ACTIVATED). Débite 4 000 FCFA.

**Auth** : JWT  
**Rate limit** : 3 requêtes / minute

**Réponse 200** :

```json
{
  "message": "Compte activé avec succès",
  "status": "ACTIVATED"
}
```

**Erreurs** :
- `400` — Compte déjà activé
- `400` — Solde insuffisant

---

### POST `/api/wallet/withdraw`

Demander un retrait.

**Auth** : JWT  
**Rate limit** : 5 requêtes / minute

**Body** :

```json
{
  "amount": 5000,
  "method": "MOBILE_MONEY",
  "accountInfo": "+22890123456"
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `amount` | number | Oui | 2 000 à 5 000 000 FCFA |
| `method` | enum | Oui | `MOBILE_MONEY`, `BANK_TRANSFER` |
| `accountInfo` | string | Oui | Max 100 caractères |

**Erreurs** :
- `400` — Compte non activé (FREE)
- `400` — Solde insuffisant
- `400` — Montant inférieur au minimum (2 000 FCFA)

---

### GET `/api/wallet/withdrawals`

Liste des demandes de retrait de l'utilisateur.

**Auth** : JWT

---

### GET `/api/wallet/admin/stats`

Statistiques financières globales.

**Auth** : ADMIN

**Réponse 200** :

```json
{
  "totalDeposits": "120000.00",
  "totalWithdrawals": "45000.00",
  "pendingWithdrawals": "5000.00",
  "totalCommissions": "18000.00"
}
```

---

## Referrals

### GET `/api/referrals/tree`

Arbre de parrainage de l'utilisateur connecté (filleuls L1 et L2).

**Auth** : JWT

**Réponse 200** :

```json
{
  "level1": [
    {
      "id": "clxyz...",
      "firstName": "Fatou",
      "lastName": "Traoré",
      "email": "fatou@example.com",
      "status": "FREE",
      "createdAt": "2026-02-08T..."
    }
  ],
  "level2": [
    {
      "id": "clabc...",
      "firstName": "Moussa",
      "lastName": "Koné",
      "email": "moussa@example.com",
      "status": "FREE",
      "createdAt": "2026-02-08T..."
    }
  ]
}
```

---

### GET `/api/referrals/commissions?page=1&limit=20`

Historique paginé des commissions de parrainage.

**Auth** : JWT

**Réponse 200** :

```json
{
  "commissions": [
    {
      "id": "clxyz...",
      "level": 1,
      "percentage": "40.00",
      "amount": "40.00",
      "createdAt": "2026-02-08T...",
      "sourceUser": {
        "firstName": "Fatou",
        "lastName": "Traoré"
      }
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/referrals/stats`

Statistiques de parrainage.

**Auth** : JWT

**Réponse 200** :

```json
{
  "totalReferrals": 5,
  "level1Count": 3,
  "level2Count": 2,
  "totalCommissions": "280.00",
  "level1Commissions": "240.00",
  "level2Commissions": "40.00",
  "level1Percent": 40,
  "level2Percent": 10
}
```

---

## Codes d'erreur

| Code HTTP | Signification |
|-----------|--------------|
| `200` | Succès |
| `201` | Créé avec succès |
| `400` | Requête invalide (validation échouée, logique métier) |
| `401` | Non authentifié (token manquant ou invalide) |
| `403` | Accès refusé (rôle insuffisant, compte suspendu) |
| `404` | Ressource introuvable |
| `409` | Conflit (doublon email, tâche déjà complétée) |
| `429` | Trop de requêtes (rate limit atteint) |
| `500` | Erreur serveur interne |

### Format des erreurs de validation

```json
{
  "statusCode": 400,
  "message": [
    "Le mot de passe doit contenir entre 6 et 128 caractères",
    "L'email n'est pas valide"
  ],
  "error": "Bad Request"
}
```

---

## Exemples cURL

### Inscription

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouveau@example.com",
    "password": "test123",
    "firstName": "Amadou",
    "lastName": "Diallo"
  }'
```

### Connexion

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@xearn.com",
    "password": "admin123"
  }'
```

### Requête authentifiée

```bash
# Remplacer <TOKEN> par l'accessToken reçu au login
curl http://localhost:4000/api/users/me \
  -H "Authorization: Bearer <TOKEN>"
```

### Compléter une tâche

```bash
curl -X POST http://localhost:4000/api/tasks/<TASK_ID>/complete \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Exemples PowerShell

```powershell
# Login
$r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@xearn.com","password":"admin123"}'

$token = $r.accessToken

# Requête authentifiée
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/users/me" -Headers $headers
```
