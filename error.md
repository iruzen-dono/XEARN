# XEARN — Audit complet du projet

**Date :** 2026-05-16  
**Branche :** main  
**Stack :** NestJS 11 + Next.js 15 + PostgreSQL 16 + Prisma 6 + FedaPay  
**Monorepo :** npm workspaces (apps/api, apps/web, packages/types)

---

## TABLE DES MATIERES

1. [Erreurs critiques](#1-erreurs-critiques)
2. [Erreurs moderees](#2-erreurs-moderees)
3. [Problemes de securite](#3-problemes-de-securite)
4. [Problemes de performance](#4-problemes-de-performance)
5. [Problemes de fiabilite](#5-problemes-de-fiabilite)
6. [Problemes de qualite de code](#6-problemes-de-qualite-de-code)
7. [Problemes frontend](#7-problemes-frontend)
8. [Problemes de tests](#8-problemes-de-tests)
9. [Problemes d'infrastructure](#9-problemes-dinfrastructure)
10. [Resume](#10-resume)

---

## 1. ERREURS CRITIQUES

### E1. Nom de table SQL incorrect dans toutes les raw queries

**Severite :** BLOQUANT en production  
**Fichiers concernes :**
- `apps/api/src/wallet/wallet.service.ts` ligne 243
- `apps/api/src/wallet/wallet.service.ts` ligne 493
- `apps/api/src/payment/payment-webhook.controller.ts` ligne 366
- `apps/api/src/payment/payment-reconciliation.service.ts` ligne 181

**Probleme :**
```sql
SELECT balance FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE
```
Le schema Prisma definit `@@map("wallets")` (schema.prisma ligne 106). La table reelle en base s'appelle `wallets`, pas `Wallet`. Toutes ces queries echoueront avec : `ERROR: relation "Wallet" does not exist`.

**Impact :** Tout retrait, toute approbation/rejet admin, tout webhook de payout echoue en production.

**Correction :**
```sql
SELECT balance FROM "wallets" WHERE "userId" = ${userId} FOR UPDATE
```

---

### E2. Comparaison montant brut vs net dans `approveWithdrawal`

**Severite :** BLOQUANT — empeche toute approbation admin  
**Fichier :** `apps/api/src/wallet/wallet.service.ts` lignes 447-450

**Probleme :**
```typescript
if (Number(pendingTx.amount) !== Number(withdrawal.amount)) {
  throw new BadRequestException('Montant incoherent entre transaction et retrait');
}
```
- `pendingTx.amount` = montant BRUT debite du wallet (ex: 10000 FCFA)
- `withdrawal.amount` = montant NET apres frais (ex: 9000 FCFA si 10% de frais)

Ces deux valeurs sont **differentes by design**. Cette verification bloquera TOUTE approbation de retrait.

**Correction :**  
Comparer `pendingTx.amount` avec le champ `metadata.netAmount` stocke dans la transaction, ou supprimer cette verification et se fier uniquement au lien `withdrawalId`.

---

### E3. Soft-delete non actif — donnees d'utilisateurs supprimes exposees

**Severite :** CRITIQUE (fuite de donnees)  
**Fichier :** `apps/api/src/prisma/prisma.service.ts` lignes 25-57

**Probleme :**
La fonction `createExtendedPrismaClient()` implemente le filtre automatique `deletedAt: null` mais n'est JAMAIS injectee. Le `PrismaService` (qui etend `PrismaClient` nu) est utilise partout dans l'application.

**Impact :**
- Les utilisateurs "supprimes" (avec `deletedAt` non null) apparaissent dans les recherches admin, les arbres de parrainage, les completions de taches, etc.
- Un utilisateur banni puis "supprime" peut potentiellement se reconnecter (son record existe toujours sans filtre)

**Correction :**  
Integrer l'extension dans le `PrismaService` injecte, ou ajouter manuellement `deletedAt: null` dans tous les `findFirst`/`findMany`/`findUnique` sur le modele User.

---

## 2. ERREURS MODEREES

### E4. Feature flags wallet/payments non implementes

**Severite :** Moderee  
**Fichier :** `apps/api/src/common/feature-flag.middleware.ts`

**Probleme :**
Le `.env.example` definit `FEATURE_WALLET_ENABLED` et `FEATURE_PAYMENTS_ENABLED` mais le middleware ne les verifie pas. Seuls `FEATURE_TASKS_ENABLED` et `FEATURE_ADS_ENABLED` sont geres (lignes 11-19).

**Impact :** Impossible de desactiver le wallet ou les paiements via feature flag en cas d'incident production.

**Correction :**  
Ajouter :
```typescript
if (req.path.startsWith('/api/v1/wallet') && this.config.get('FEATURE_WALLET_ENABLED') === 'false') {
  throw new ServiceUnavailableException('Module wallet temporairement desactive');
}
if (req.path.startsWith('/api/v1/payment') && this.config.get('FEATURE_PAYMENTS_ENABLED') === 'false') {
  throw new ServiceUnavailableException('Module paiements temporairement desactive');
}
```

---

### E5. `process.env` utilise directement au lieu de `ConfigService`

**Severite :** Moderee  
**Fichier :** `apps/api/src/wallet/wallet.service.ts` lignes 227-233

**Probleme :**
```typescript
const dailyCountLimit = parseInt(process.env.WITHDRAWAL_DAILY_COUNT_LIMIT || '3', 10);
const dailyAmountLimit = parseInt(process.env.WITHDRAWAL_DAILY_LIMIT_FCFA || '50000', 10);
```
Le reste du service utilise `this.configService`. L'acces direct bypass la validation de configuration NestJS et ne peut pas etre surcharge dans les tests.

**Correction :**
```typescript
const dailyCountLimit = this.configService.get<number>('WITHDRAWAL_DAILY_COUNT_LIMIT') || 3;
const dailyAmountLimit = this.configService.get<number>('WITHDRAWAL_DAILY_LIMIT_FCFA') || 50000;
```

---

### E6. Race condition dans l'enregistrement des streaks

**Severite :** Moderee  
**Fichier :** `apps/api/src/gamification/gamification.service.ts` methode `recordActivity()`

**Probleme :**
La methode lit le streak existant, verifie si l'activite du jour a deja ete enregistree, puis met a jour. Si deux requetes arrivent simultanement (ex: double-clic sur complete task), le streak peut etre incremente deux fois pour le meme jour.

**Correction :**  
Ajouter un verrou `FOR UPDATE` sur la lecture du streak, ou utiliser une contrainte unique sur `(userId, date)` dans un modele d'activite quotidienne.

---

### E7. FedaPay provider continue sans cle secrete

**Severite :** Moderee  
**Fichier :** `apps/api/src/payment/fedapay.provider.ts` lignes 56-58

**Probleme :**
Si `FEDAPAY_SECRET_KEY` est manquante, le provider log un warning mais ne bloque pas l'initialisation. Les appels API FedaPay echoueront silencieusement avec des erreurs cryptiques au moment du paiement.

**Correction :**  
Lancer une erreur au demarrage si `PAYMENT_MODE=fedapay` et que la cle est absente.

---

### E8. Badge reward enregistre comme `TASK_EARNING`

**Severite :** Moderee  
**Fichier :** `apps/api/src/gamification/gamification.service.ts` (methode d'attribution de badge)

**Probleme :**
Les bonus de badge (ex: 5000 FCFA pour streak 100 jours) sont enregistres comme `TASK_EARNING` dans la table transactions. Cela fausse les statistiques de revenus par source, et peut declencher des commissions de parrainage sur des bonus qui ne devraient pas en generer.

**Correction :**  
Ajouter un type `BADGE_REWARD` au schema, ou utiliser un type existant plus adequat comme metadata pour distinguer.

---

## 3. PROBLEMES DE SECURITE

### S1. Pas de rate limit specifique sur les routes sensibles d'authentification

**Severite :** Haute  
**Fichier :** `apps/api/src/auth/auth.controller.ts`

**Probleme :**
Les routes de login ont un throttle a 10/min (ligne 54) et forgot-password a 3/min (ligne 126). Cependant, le throttle global (10/s burst) permet toujours une attaque brute force a haute vitesse pendant la premiere seconde. De plus, le throttle est par IP — un attaquant derrierre un NAT/VPN peut contourner.

**Recommandation :**
- Ajouter un rate limit par identifiant (email/phone) en plus de par IP
- Implementer un mecanisme de lockout apres N echecs consecutifs

---

### S2. Swagger expose en environnement non-production (staging inclus)

**Severite :** Moyenne  
**Fichier :** `apps/api/src/main.ts` lignes 195-211

**Probleme :**
```typescript
if (configService.get('NODE_ENV') !== 'production') {
```
En staging (`NODE_ENV=staging`), Swagger est accessible publiquement. Un attaquant peut decouvrir tous les endpoints, DTOs, parametres et structures de reponse.

**Correction :**  
Restreindre a `NODE_ENV === 'development'` ou ajouter une authentification basique sur `/docs`.

---

### S3. CSP autorise `unsafe-inline` pour les styles

**Severite :** Faible  
**Fichiers :**
- `apps/api/src/main.ts` ligne 87
- `apps/web/next.config.js` directive CSP

**Probleme :**
`style-src: 'self' 'unsafe-inline'` permet l'injection de CSS (UI redressing, data exfiltration via CSS selectors). Necessaire pour Tailwind/Next.js mais a documenter comme risque accepte.

---

### S4. Middleware Next.js ne valide pas la signature JWT

**Severite :** Faible (UX, pas securite)  
**Fichier :** `apps/web/src/middleware.ts` ligne 34

**Probleme :**
Le middleware verifie uniquement la presence du cookie `accessToken`, pas sa validite. Un token expire ou forge passe le middleware — l'utilisateur voit brievement le dashboard avant redirection au 401.

**Impact :** UX degradee. Pas de faille car les donnees sont protegees cote API.

---

### S5. Token de verification email : race condition theorique

**Severite :** Tres faible  
**Fichier :** `apps/api/src/auth/auth.service.ts` methode `verifyEmail()`

**Probleme :**
Si deux requetes arrivent simultanement avec le meme token, les deux pourraient reussir le `findFirst` avant le `update` qui efface le token. Impact nul (double-verification est inoffensive).

---

### S6. Admin password faible visible dans le repo

**Severite :** Moyenne  
**Fichiers :**
- `.env.example` ligne 89 : `ADMIN_PASSWORD="Admin1234"`
- `apps/api/prisma/seed.ts` ligne 11 : fallback `'Admin1234'`

**Probleme :**
Mot de passe visible dans le repo public. Risque qu'un deploiement utilise le defaut sans le changer.

**Correction :**
- Remplacer par `ADMIN_PASSWORD="CHANGE_ME_BEFORE_DEPLOY"`
- Ajouter une validation dans le seed : erreur si le password est un placeholder

---

### S7. Cookie `secure` flag uniquement en production

**Severite :** Faible  
**Fichier :** `apps/api/src/auth/auth.cookies.ts` lignes 43-44

**Probleme :**
```typescript
const isProd = String(configService.get('NODE_ENV') || '').toLowerCase() === 'production';
secure: isProd,
```
En staging (qui devrait etre HTTPS), les cookies ne sont pas marques `secure`. Ils peuvent etre interceptes si staging utilise un fallback HTTP.

**Correction :**  
Utiliser `secure: true` des que l'URL est en HTTPS (detecter via `CORS_ORIGINS` ou une variable dediee).

---

### S8. Webhook secret fallback sur `FEDAPAY_SECRET_KEY`

**Severite :** Moyenne  
**Fichier :** `apps/api/src/payment/payment-webhook.controller.ts` lignes 65-67

**Probleme :**
```typescript
const secret = this.configService.get('FEDAPAY_WEBHOOK_SECRET') || this.configService.get('FEDAPAY_SECRET_KEY');
```
Si `FEDAPAY_WEBHOOK_SECRET` n'est pas configure, le code utilise la cle API comme secret de signature. Ce sont deux secrets distincts — la cle API ne devrait jamais servir a verifier des signatures webhook.

**Correction :**  
Exiger explicitement `FEDAPAY_WEBHOOK_SECRET` et rejeter le webhook si absent (le code le fait deja si `!secret`, mais le fallback masque le probleme).

---

## 4. PROBLEMES DE PERFORMANCE

### P1. `getPublisherStats` charge toutes les ads en memoire

**Severite :** Moyenne (a echelle)  
**Fichier :** `apps/api/src/ads/ads.service.ts` lignes 182-209

**Probleme :**
```typescript
const ads = await this.prisma.advertisement.findMany({ where: { publisherId } });
```
Pas de pagination ni selection de colonnes. Si un publisher a 10 000 ads, tout est charge en RAM pour calculer des sommes.

**Correction :**  
Utiliser `aggregate` Prisma :
```typescript
const stats = await this.prisma.advertisement.aggregate({
  where: { publisherId },
  _sum: { spent: true, budget: true },
  _count: { _all: true },
});
```

---

### P2. Filtrage JSON array `targetTiers` non indexable

**Severite :** Faible (negligeable < 1000 ads)  
**Fichier :** `apps/api/src/ads/ads.service.ts` lignes 49-52

**Probleme :**
`{ targetTiers: { has: userTier } }` fait un full-table scan car les colonnes JSON array PostgreSQL ne sont pas indexables efficacement.

**Correction future :**  
Migrer vers une junction table `ad_target_tiers(adId, tier)` avec index composite quand le volume d'ads depasse 10 000.

---

### P3. Reconciliation sequentielle sans batch

**Severite :** Faible  
**Fichier :** `apps/api/src/payment/payment-reconciliation.service.ts`

**Probleme :**
La reconciliation itere sur chaque transaction pending une par une (`for...of`) et fait un appel API FedaPay par transaction. Avec beaucoup de transactions pending, le cron de 5 min pourrait ne pas finir avant la prochaine execution.

**Correction :**  
- Ajouter un `take: 50` pour limiter chaque batch
- Utiliser `Promise.allSettled` pour paralleliser les appels (avec un pool de concurrence)

---

### P4. Pas de cache HTTP sur les endpoints statiques

**Severite :** Faible  
**Fichier :** `apps/api/src/wallet/wallet.service.ts` methodes `getTierPricing()`, `getWithdrawalFees()`

**Probleme :**
Ces endpoints retournent des valeurs de configuration immuables en runtime. Chaque appel fait un round-trip API inutile.

**Correction :**  
Ajouter un header `Cache-Control: max-age=3600` sur ces endpoints.

---

## 5. PROBLEMES DE FIABILITE

### R1. Pas de timeout sur la reconciliation cron

**Severite :** Moyenne  
**Fichier :** `apps/api/src/payment/payment-reconciliation.service.ts`

**Probleme :**
Le flag `running = true` (ligne 29) empeche les executions concurrentes, mais si une reconciliation plante (erreur non geree, timeout API FedaPay), le flag reste a `true` indefiniment. Toutes les futures reconciliations sont bloquees.

**Correction :**  
Ajouter un timeout ou un mecanisme de reset (ex: timestamp de debut + duree max).

---

### R2. Notifications best-effort sans trace

**Severite :** Faible  
**Fichiers :**
- `apps/api/src/tasks/tasks.service.ts` lignes 235-240
- `apps/api/src/wallet/wallet.service.ts` lignes 128-132
- `apps/api/src/referrals/referrals.service.ts` (multiple)
- `apps/api/src/payment/payment-reconciliation.service.ts` lignes 72-76

**Probleme :**
Toutes les notifications sont dans des `try/catch` qui ignorent silencieusement les erreurs (`/* ignore */`). Si la creation de notification echoue de maniere systematique (ex: colonne manquante apres migration), personne n'est alerte.

**Correction :**  
Ajouter au minimum un `this.logger.warn()` dans les catch blocks.

---

### R3. Aucune purge des donnees temporaires

**Severite :** Faible  
**Observations :**
- Les `TaskSession` non completees s'accumulent indefiniment
- Les `WebhookEvent` s'accumulent sans purge (utiles pour debug mais croissent indefiniment)
- Les notifications lues anciennes ne sont jamais nettoyees
- Les tokens de verification expires restent en base

**Correction :**  
Ajouter un cron de nettoyage (ex: hebdomadaire) pour purger les donnees > 30 jours.

---

### R4. Reconciliation ne gere pas les transactions "oubliees"

**Severite :** Faible  
**Fichier :** `apps/api/src/payment/payment-reconciliation.service.ts`

**Probleme :**
Si une transaction reste PENDING pendant des jours (FedaPay ne repond jamais), elle est re-tentee a chaque cron indefiniment sans jamais expirer ni alerter un admin.

**Correction :**  
Ajouter une logique d'expiration (ex: PENDING > 48h → FAILED + alert admin).

---

## 6. PROBLEMES DE QUALITE DE CODE

### Q1. Dependances `file:` auto-referentielles

**Severite :** Faible  
**Fichiers :**
- `package.json` (racine) : `"xearn": "file:"`
- `apps/api/package.json` : `"web": "file:../web"`, `"xearn": "file:../.."`
- `apps/web/package.json` : `"web": "file:"`

**Probleme :**
Self-references inutiles qui compliquent `npm ls` et peuvent causer des boucles de resolution.

**Correction :**  
Supprimer `"xearn": "file:"`, `"web": "file:"`, et `"web": "file:../web"` du API package.json.

---

### Q2. `NotificationsModule` non importe dans `PaymentModule`

**Severite :** Faible (fonctionne grace au scope global mais conceptuellement incorrect)  
**Fichier :** `apps/api/src/payment/payment.module.ts`

**Probleme :**
`PaymentReconciliationService` injecte `NotificationsService` mais `PaymentModule` n'importe pas `NotificationsModule`. Cela fonctionne si `NotificationsModule` est importe dans `AppModule` (scope global via providers), mais cree un couplage implicite.

---

### Q3. Duplications dans wallet.service.ts et payment-webhook.controller.ts

**Severite :** Faible  
**Observation :**
La logique de remboursement wallet (`FOR UPDATE` + increment + update withdrawal status + update transaction status) est dupliquee dans :
- `wallet.service.ts` methode `rejectWithdrawal`
- `payment-webhook.controller.ts` methode `handlePayoutFailed`
- `payment-reconciliation.service.ts` methode `reconcileWithdrawals` (cas failed)

**Correction future :**  
Extraire dans une methode partagee `refundWithdrawal(withdrawalId)`.

---

### Q4. Fichier `logs/api.log` dans l'arborescence

**Severite :** Faible  
**Fichier :** `logs/api.log`

**Probleme :**
Un fichier de log est present dans le repository. En production containerisee (Railway/Docker), les logs fichier sont perdus au redemarrage. Le structured logger devrait ecrire uniquement sur stdout.

**Correction :**  
Ajouter `logs/` au `.gitignore` et supprimer le fichier du repo.

---

## 7. PROBLEMES FRONTEND

### F1. Pas d'error boundary declaratif

**Severite :** Faible  
**Observation :**
Les fichiers `error.tsx` existent (Next.js error boundaries) mais les pages dashboard/admin ne gerent pas localement les erreurs de rendu des composants enfants. Un crash dans un widget (ex: graphe recharts) fait tomber toute la page.

---

### F2. Service worker en erreur silencieuse

**Severite :** Faible  
**Fichier :** `apps/web/src/app/providers.tsx` ligne 41

**Probleme :**
```typescript
.catch(() => {});
```
Les erreurs d'enregistrement du service worker sont completement ignorees. Si le SW est bloque (ex: CSP), l'app PWA ne fonctionne pas et personne n'est alerte.

---

### F3. Admin redirect flash — UX

**Severite :** Faible  
**Fichier :** `apps/web/src/app/admin/layout.tsx`

**Probleme :**
La verification du role admin se fait cote client dans un `useEffect`. L'utilisateur non-admin voit brievement le layout admin (avec loading spinner) avant d'etre redirige. Le middleware Next.js ne verifie pas le role.

**Correction :**  
Verifier le role dans le middleware server-side (necessite de decoder le JWT cote middleware).

---

### F4. `api-base-url.ts` strip `/api` du end

**Severite :** Faible  
**Fichier :** `apps/web/src/lib/api-base-url.ts`

**Probleme :**
```typescript
return value.replace(/\/api\/?$/, '').replace(/\/+$/, '');
```
Si quelqu'un configure `NEXT_PUBLIC_API_URL=https://api.xearn.com/api` (qui est plausible), le strip est correct. Mais si c'est `https://api.xearn.com` (sans `/api`), le rawFetch ajoute `/api` en prefixe (ligne 77 de api.ts), ce qui donne `https://api.xearn.com/api/auth/login`. Mais l'API a un prefix `/api/v1`. Il y a une incoherence entre `/api` (frontend) et `/api/v1` (backend).

**Impact :** Le frontend doit etre configure avec la bonne base URL incluant `/v1` pour que les appels fonctionnent.

---

## 8. PROBLEMES DE TESTS

### T1. Couverture insuffisante sur `auth-cookies.spec.ts`

**Severite :** Moyenne  
**Fichier :** `apps/api/test/auth-cookies.spec.ts` (16 lignes, 2 tests)

**Probleme :**
Seuls 2 cas sont testes (parse duration + CSRF token length). Manquent :
- Tests des flags `secure`, `httpOnly`, `sameSite`
- Test de `clearAuthCookies`
- Test du cookie maxAge en correlation avec JWT_EXPIRATION

---

### T2. Tests de taches incomplets — wallet et commissions non verifies

**Severite :** Moyenne  
**Fichier :** `apps/api/test/tasks.service.spec.ts`

**Probleme :**
Les tests verifient les erreurs (task not found, already completed, etc.) mais ne verifient pas :
- Que le wallet est credite du bon montant
- Que la transaction TASK_EARNING est creee
- Que les commissions de parrainage sont distribuees
- Que le compteur `completionCount` est incremente

---

### T3. Tests E2E absents

**Severite :** Moyenne  
**Fichier :** `apps/web/package.json` script `test:e2e`, CI smoke-tests

**Probleme :**
Le script Playwright est configure et le CI reference des smoke tests, mais aucun fichier de test `.spec.ts` Playwright n'est visible dans l'arborescence. Les smoke tests en CI echouent ou passent trivialement.

---

### T4. Tests de signature webhook minimalistes

**Severite :** Faible  
**Fichier :** `apps/api/test/fedapay-signature.spec.ts` (28 lignes, 3 tests)

**Manquent :**
- Test avec rawBody vide/null
- Test avec signature tronquee
- Test avec secret vide
- Test de timing safety (verification que `timingSafeEqual` est utilise)

---

## 9. PROBLEMES D'INFRASTRUCTURE

### I1. `npm audit` en `continue-on-error: true`

**Severite :** Moyenne  
**Fichier :** `.github/workflows/ci-cd.yml` ligne 79

**Probleme :**
L'audit de securite npm ne bloque jamais la pipeline. Des vulnerabilites `high` peuvent etre deployees en production sans alerte.

**Correction :**  
Retirer `continue-on-error` ou passer a `--audit-level=critical` pour ne bloquer que sur les failles critiques.

---

### I2. Dockerfile copie tout le `/app` dans le runner

**Severite :** Faible  
**Fichiers :** `Dockerfile.api` ligne 21, `Dockerfile.web` ligne 22

**Probleme :**
```dockerfile
COPY --from=builder /app /app
```
Copie l'integralite du workspace (node_modules de dev, fichiers sources, .git si present) dans l'image finale. L'image est 2-3x plus grosse que necessaire.

**Correction :**  
Copier uniquement les fichiers necessaires :
```dockerfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/package.json ./package.json
```

---

### I3. Pre-commit hook minimaliste

**Severite :** Faible  
**Fichier :** `.husky/pre-commit`

**Probleme :**
Le hook execute uniquement `npx lint-staged` (formatting). Pas de :
- Type checking (`tsc --noEmit`)
- Verification de secrets accidentels
- Verification que les tests passent

**Note :** Acceptable si la CI couvre tout. Ajouter un type-check local accelererait le feedback.

---

### I4. Docker compose ne definit pas de limites de ressources

**Severite :** Tres faible (dev uniquement)  
**Fichier :** `docker-compose.yml`

**Probleme :**
Pas de `mem_limit` ni `cpus` sur le service postgres. En dev, un query mal optimisee peut consommer toute la RAM.

---

## 10. RESUME

| # | ID | Categorie | Severite | Description courte |
|---|-----|-----------|----------|-------------------|
| 1 | E1 | Erreur | CRITIQUE | Raw SQL `"Wallet"` au lieu de `"wallets"` |
| 2 | E2 | Erreur | CRITIQUE | Comparaison brut vs net bloque approveWithdrawal |
| 3 | E3 | Erreur | CRITIQUE | Soft-delete jamais applique |
| 4 | E4 | Erreur | Moderee | Feature flags wallet/payments non implementes |
| 5 | E5 | Erreur | Moderee | process.env direct au lieu de ConfigService |
| 6 | E6 | Erreur | Moderee | Race condition streak gamification |
| 7 | E7 | Erreur | Moderee | FedaPay provider sans cle ne bloque pas |
| 8 | E8 | Erreur | Moderee | Badge reward enregistre comme TASK_EARNING |
| 9 | S1 | Securite | Haute | Pas de rate limit par identifiant (brute force) |
| 10 | S2 | Securite | Moyenne | Swagger expose en staging |
| 11 | S3 | Securite | Faible | CSP unsafe-inline styles |
| 12 | S4 | Securite | Faible | Middleware Next.js ne valide pas JWT |
| 13 | S5 | Securite | Tres faible | Race condition verification email |
| 14 | S6 | Securite | Moyenne | Admin password faible dans le repo |
| 15 | S7 | Securite | Faible | Cookie secure uniquement en production |
| 16 | S8 | Securite | Moyenne | Webhook secret fallback sur API key |
| 17 | P1 | Performance | Moyenne | getPublisherStats charge tout en RAM |
| 18 | P2 | Performance | Faible | targetTiers JSON non indexable |
| 19 | P3 | Performance | Faible | Reconciliation sequentielle sans batch |
| 20 | P4 | Performance | Faible | Pas de cache HTTP endpoints statiques |
| 21 | R1 | Fiabilite | Moyenne | Reconciliation flag bloqueant sans timeout |
| 22 | R2 | Fiabilite | Faible | Notifications silencieuses |
| 23 | R3 | Fiabilite | Faible | Pas de purge des donnees temporaires |
| 24 | R4 | Fiabilite | Faible | Transactions pending sans expiration |
| 25 | Q1 | Qualite | Faible | Dependances file: auto-referentielles |
| 26 | Q2 | Qualite | Faible | NotificationsModule non importe dans PaymentModule |
| 27 | Q3 | Qualite | Faible | Duplication logique remboursement wallet |
| 28 | Q4 | Qualite | Faible | Fichier log dans le repo |
| 29 | F1 | Frontend | Faible | Pas d'error boundary granulaire |
| 30 | F2 | Frontend | Faible | Service worker erreur silencieuse |
| 31 | F3 | Frontend | Faible | Admin redirect flash |
| 32 | F4 | Frontend | Faible | Incoherence /api vs /api/v1 |
| 33 | T1 | Tests | Moyenne | auth-cookies couverture insuffisante |
| 34 | T2 | Tests | Moyenne | Tasks tests ne verifient pas wallet/commissions |
| 35 | T3 | Tests | Moyenne | Tests E2E Playwright absents |
| 36 | T4 | Tests | Faible | Tests signature webhook minimalistes |
| 37 | I1 | Infra | Moyenne | npm audit non-bloquant en CI |
| 38 | I2 | Infra | Faible | Docker image trop grosse |
| 39 | I3 | Infra | Faible | Pre-commit sans type-check |
| 40 | I4 | Infra | Tres faible | Docker compose sans limites RAM |

---

## ORDRE DE CORRECTION RECOMMANDE

**Sprint 1 — Bloquants (avant mise en production) :**
1. E1 — Corriger `"Wallet"` → `"wallets"` dans toutes les raw queries
2. E2 — Corriger la comparaison montant dans approveWithdrawal
3. E3 — Activer le soft-delete ou ajouter les filtres manuels

**Sprint 2 — Securite et robustesse :**
4. S1 — Rate limit par identifiant sur login/forgot-password
5. S8 — Supprimer le fallback webhook secret
6. S6 — Remplacer le admin password par un placeholder
7. E4 — Implementer les feature flags wallet/payments
8. R1 — Ajouter timeout sur la reconciliation

**Sprint 3 — Qualite et monitoring :**
9. E5 — Migrer vers ConfigService
10. I1 — Rendre npm audit bloquant
11. T3 — Ecrire les tests E2E de base
12. Q4 — Nettoyer logs/ du repo
13. I2 — Optimiser les Dockerfiles

---

*Fin de l'audit — 40 observations, 3 critiques, 8 moderees, 29 faibles/informatives*
