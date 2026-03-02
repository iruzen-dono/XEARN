# Référence API — XEARN

Base URL : `http://localhost:4000/api`

Toutes les réponses sont en JSON. Les routes protégées nécessitent le header :

```
Authorization: Bearer <accessToken>
```

Ou l'authentification par cookies httpOnly (recommandée pour le frontend web).

---

## Table des matières

- [Health](#health)
- [Auth](#auth)
- [Users](#users)
- [Tasks](#tasks)
- [Wallet](#wallet)
- [Referrals](#referrals)
- [Payment](#payment)
- [Notifications](#notifications)
- [Ads (Pub Maker)](#ads-pub-maker)
- [Niveaux de compte (Tiers)](#niveaux-de-compte-tiers)
- [Codes d'erreur](#codes-derreur)

---

## Health

### GET `/api/health`

Vérification de l'état de santé de l'API et de la base de données.

**Auth** : Aucune

**Réponse 200** (API et DB en ligne) :

```json
{
  "status": "ok",
  "db": "connected"
}
```

**Réponse 503** (DB inaccessible) :

```json
{
  "status": "error",
  "db": "disconnected"
}
```

> **Note** : Utilisé par les load balancers et le monitoring pour vérifier la disponibilité de l'API. Retourne un code **503 Service Unavailable** si la base de données ne répond pas.

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
| `password` | string | Oui | 8 à 128 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre |
| `firstName` | string | Oui | 1 à 50 caractères |
| `lastName` | string | Oui | 1 à 50 caractères |
| `referralCode` | string | Non | Max 50 caractères |

\* Au moins `email` ou `phone` doit être fourni.

**Réponse 201** :

```json
{
  "requiresEmailVerification": true,
  "message": "Inscription réussie ! Vérifiez votre boîte email pour activer votre compte."
}
```

Un email de vérification est envoyé automatiquement à l'adresse fournie. L'utilisateur doit cliquer sur le lien pour activer son compte avant de pouvoir se connecter.

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
- `403` — Email non vérifié (message: "Veuillez vérifier votre email avant de vous connecter")

---

### POST `/api/auth/google`

Connexion / inscription via Google OAuth. Appelé par le frontend après authentification Google via NextAuth.

**Body** :

```json
{
  "email": "user@gmail.com",
  "googleId": "1234567890",
  "firstName": "Amadou",
  "lastName": "Diallo"
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `email` | string | Oui | Format email valide |
| `googleId` | string | Oui | ID Google |
| `firstName` | string | Non | Prénom |
| `lastName` | string | Non | Nom |

**Réponse 200/201** :

```json
{
  "user": {
    "id": "clxyz...",
    "email": "user@gmail.com",
    "firstName": "Amadou",
    "lastName": "Diallo",
    "role": "USER",
    "status": "FREE",
    "provider": "GOOGLE"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

Si l'utilisateur n'existe pas, il est créé automatiquement avec `emailVerifiedAt` défini (pas besoin de vérification email).

> **Note** : Si un compte avec le même email existe déjà avec un mot de passe (provider LOCAL), le provider n'est pas écrasé. Le `googleId` est ajouté mais le provider reste LOCAL, permettant à l'utilisateur de continuer à se connecter avec son mot de passe.

---

### GET `/api/auth/verify-email?token=xxx`

Vérification de l'email via le lien envoyé à l'inscription.

**Query params** :

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `token` | string | Oui | Token de vérification (reçu par email) |

**Réponse** : Redirection `302` vers `/login?verified=true`

**Erreurs** :
- `400` — Token invalide ou expiré (après 24h)

---

### POST `/api/auth/resend-verification`

Renvoyer l'email de vérification.

**Body** :

```json
{
  "email": "user@example.com"
}
```

**Réponse 200** :

```json
{
  "message": "Email de vérification envoyé"
}
```

**Erreurs** :
- `400` — Email déjà vérifié
- `404` — Utilisateur introuvable

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
- `401` — **Token révoqué** (tokenVersion invalide — survient après un changement ou reset de mot de passe)

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

Liste paginée des tâches disponibles (actives, non expirées). **Les tâches sont filtrées par le tier de l'utilisateur** : seules les tâches dont le `requiredTier` est inférieur ou égal au tier de l'utilisateur sont affichées.

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

### GET `/api/tasks/my-completions?page=1&limit=20`

Tâches complétées par l'utilisateur connecté (paginé).

**Auth** : JWT

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 20 | Éléments par page |

**Réponse 200** :

```json
{
  "completions": [
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
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### POST `/api/tasks/:id/start`

Démarrer une tâche. L'utilisateur est redirigé vers l'URL de la tâche.

**Auth** : JWT

**Réponse 200** :

```json
{
  "message": "Tâche démarrée"
}
```

**Erreurs** :
- `404` — Tâche introuvable
- `400` — Tâche déjà complétée, inactive, ou expirée

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
- `400` — Tâche déjà complétée, inactive
- `400` — **Tâche expirée** (vérification côté serveur de `expiresAt`)
- `400` — Compte non activé
- `400` — **Tier insuffisant** ("Cette tâche nécessite le niveau PREMIUM/VIP")
- `400` — Temps insuffisant (anti-triche)

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
| `requiredTier` | enum | Non | `NORMAL` (défaut), `PREMIUM`, `VIP` — tier minimum requis |

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

Demander un retrait. **Les frais sont calculés selon le tier de l'utilisateur** : Normal = 10%, Premium = 5%, VIP = 2%.

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

### GET `/api/wallet/fees`

Informations sur les frais de retrait pour l'utilisateur connecté.

**Auth** : JWT

**Réponse 200** :

```json
{
  "tier": "NORMAL",
  "feePercent": 10,
  "description": "Normal: 10% de frais"
}
```

---

### GET `/api/wallet/tier-pricing`

Prix des upgrades de tier.

**Auth** : JWT

**Réponse 200** :

```json
{
  "PREMIUM": 10000,
  "VIP": 25000
}
```

---

### POST `/api/wallet/upgrade-tier`

Upgrader le niveau de compte. Débite le montant du wallet.

**Auth** : JWT  
**Rate limit** : 3 requêtes / minute

**Body** :

```json
{
  "targetTier": "PREMIUM"
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `targetTier` | enum | Oui | `PREMIUM` ou `VIP` |

**Réponse 200** :

```json
{
  "message": "Compte upgrated vers PREMIUM",
  "tier": "PREMIUM"
}
```

**Erreurs** :
- `400` — Déjà à ce tier ou supérieur
- `400` — Solde insuffisant

---

### GET `/api/wallet/withdrawals?page=1&limit=20`

Liste paginée des demandes de retrait de l'utilisateur.

**Auth** : JWT

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 20 | Éléments par page |

**Réponse 200** :

```json
{
  "withdrawals": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 20
}

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

Arbre de parrainage de l'utilisateur connecté (filleuls L1, L2, et **L3 si VIP**).

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
  "level2": [ ... ],
  "level3": [ ... ]
}
```

> **Note** : `level3` n'est renseigné que si l'utilisateur est **VIP**. Sinon, c'est un tableau vide.
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
  "totalLevel3": 1,
  "totalCommissions": "325.00",
  "level1Commissions": "240.00",
  "level2Commissions": "40.00",
  "commissionsL3": "45.00",
  "level1Percent": 40,
  "level2Percent": 10,
  "l3Percent": 5,
  "userTier": "VIP",
  "l3Active": true
}
```

> `l3Active` est `true` uniquement pour les utilisateurs **VIP**.
```

---

## Payment

### POST `/api/payment/webhook`

Webhook de paiement FedaPay. Appel\u00e9 automatiquement par FedaPay apr\u00e8s un paiement.

**Auth** : V\u00e9rification HMAC via `FEDAPAY_WEBHOOK_SECRET` (header `x-fedapay-signature`)

**Headers** :

| Header | Description |
|--------|-------------|
| `x-fedapay-signature` | Signature HMAC FedaPay |

**Body** : Payload FedaPay (structure variable selon le type de transaction)

**R\u00e9ponse 200** : `{ "received": true }`

> **Note** : En mode `mock` (`PAYMENT_MODE=mock`), les webhooks sont simul\u00e9s automatiquement.

---
## Notifications

### GET `/api/notifications?page=1`

Liste paginée des notifications de l'utilisateur connecté.

**Auth** : JWT

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |

**Réponse 200** :

```json
{
  "notifications": [
    {
      "id": "clxyz...",
      "type": "TASK_COMPLETED",
      "title": "Tâche complétée",
      "message": "Vous avez gagné 100 FCFA",
      "read": false,
      "createdAt": "2026-02-08T..."
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

---

### GET `/api/notifications/unread-count`

Nombre de notifications non lues.

**Auth** : JWT

**Réponse 200** :

```json
{
  "count": 3
}
```

---

### PATCH `/api/notifications/:id/read`

Marquer une notification comme lue.

**Auth** : JWT

**Réponse 200** : Notification mise à jour

---

### PATCH `/api/notifications/read-all`

Marquer toutes les notifications comme lues.

**Auth** : JWT

**Réponse 200** : `{ "count": 5 }` (nombre de notifications mises à jour)

---

## Ads (Pub Maker)

### GET `/api/ads?page=1`

Liste des publicités actives. **Filtrées par le tier et le pays de l'utilisateur** (ciblage). Les publicités dont le budget est épuisé sont exclues.

**Auth** : JWT (requis pour le ciblage par tier/pays)

**Query params** :

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `page` | number | 1 | Numéro de page |

**Réponse 200** :

```json
{
  "ads": [
    {
      "id": "clxyz...",
      "publisherId": "clabc...",
      "title": "Promo MTN",
      "description": "Offre spéciale 5G",
      "mediaUrl": "https://example.com/image.jpg",
      "targetUrl": "https://mtn.com/promo",
      "status": "ACTIVE",
      "expiresAt": "2026-06-01T00:00:00.000Z",
      "createdAt": "2026-02-08T..."
    }
  ],
  "total": 10,
  "page": 1,
  "pages": 1
}
```

---

### POST `/api/ads`

Créer une publicité (l'utilisateur connecté devient le publisher).

**Auth** : JWT (**rôle PARTNER ou ADMIN requis**)

**Body** :

```json
{
  "title": "Promo MTN",
  "description": "Offre spéciale 5G",
  "mediaUrl": "https://example.com/image.jpg",
  "targetUrl": "https://mtn.com/promo",
  "expiresAt": "2026-06-01T00:00:00.000Z",
  "targetCountries": ["TG", "BJ", "CI"],
  "targetTiers": ["NORMAL", "PREMIUM", "VIP"],
  "budget": 50000
}
```

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `title` | string | Oui | 3 à 120 caractères |
| `description` | string | Non | Max 500 caractères |
| `mediaUrl` | string | Non | URL valide |
| `targetUrl` | string | Non | URL valide |
| `expiresAt` | string | Non | Date ISO 8601 |
| `targetCountries` | string[] | Non | Codes pays ISO (ex: `["TG", "BJ"]`) |
| `targetTiers` | enum[] | Non | `NORMAL`, `PREMIUM`, `VIP` |
| `budget` | number | Non | Budget max en FCFA (≥ 0) |

**Réponse 201** : La publicité créée (status: `PENDING`)

---

### GET `/api/ads/mine?page=1`

Liste des publicités de l'utilisateur connecté.

**Auth** : JWT

---

### PATCH `/api/ads/:id`

Mettre à jour une publicité (uniquement le publisher ou un admin).

**Auth** : JWT

**Body** : Mêmes champs que `POST /api/ads` (tous optionnels), y compris `targetCountries`, `targetTiers`, `budget`. Les admins peuvent aussi passer `status`.

---

### DELETE `/api/ads/:id`

Supprimer une publicité (uniquement le publisher ou un admin).

**Auth** : JWT

---

### GET `/api/ads/admin/all?page=1&status=PENDING`

Liste admin de toutes les publicités.

**Auth** : ADMIN

**Query params** :

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Numéro de page |
| `status` | string | Filtrer par statut (`PENDING`, `ACTIVE`, `PAUSED`, `EXPIRED`, `REJECTED`) |

---

### PATCH `/api/ads/admin/:id/approve`

Approuver une publicité (passe en `ACTIVE`).

**Auth** : ADMIN

---

### PATCH `/api/ads/admin/:id/reject`

Rejeter une publicité (passe en `REJECTED`).

**Auth** : ADMIN

---

### PATCH `/api/ads/admin/:id/pause`

Mettre en pause une publicité (passe en `PAUSED`).

**Auth** : ADMIN

---

## Niveaux de compte (Tiers)

XEARN propose 3 niveaux de compte avec des avantages progressifs :

| Tier | Prix | Frais de retrait | Tâches accessibles | Parrainage L3 |
|------|------|-----------------|--------------------|--------------|
| **NORMAL** | Gratuit (défaut) | 10% | Standard uniquement | ❌ |
| **PREMIUM** | 10 000 FCFA | 5% | Standard + Premium | ❌ |
| **VIP** | 25 000 FCFA | 2% | Toutes (Standard + Premium + VIP) | ✅ 5% |

### Endpoints liés aux tiers

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/wallet/fees` | GET | Frais de retrait selon le tier de l'utilisateur |
| `/api/wallet/tier-pricing` | GET | Prix d'upgrade PREMIUM et VIP |
| `/api/wallet/upgrade-tier` | POST | Upgrader son tier (débite le wallet) |

### Impact sur les autres modules

- **Tâches** : `GET /api/tasks` filtre automatiquement par `requiredTier <= user.tier`. Les tâches avec `requiredTier: PREMIUM` ne sont pas visibles par un utilisateur NORMAL.
- **Retraits** : `POST /api/wallet/withdraw` applique les frais selon le tier. Les frais sont stockés dans les métadonnées de la transaction.
- **Parrainage** : `GET /api/referrals/tree` inclut les filleuls L3 seulement pour les VIP. Les commissions L2 (10%) ne sont distribuées qu'aux bénéficiaires **PREMIUM ou VIP**. Les commissions L3 (5%) ne sont distribuées qu'aux parrains VIP.
- **Publicités** : `POST /api/ads` est réservé aux rôles `PARTNER` et `ADMIN`. Les pubs peuvent cibler des tiers spécifiques via `targetTiers`.

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
    "password": "Motdepasse1",
    "firstName": "Amadou",
    "lastName": "Diallo"
  }'
```

### Connexion

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juleszhou00@gmail.com",
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
  -Body '{"email":"juleszhou00@gmail.com","password":"admin123"}'

$token = $r.accessToken

# Requête authentifiée
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/users/me" -Headers $headers
```
