# Changelog — XEARN

Toutes les modifications notables du projet sont documentées dans ce fichier.

---

## [Unreleased] — Phase 11 : Audit sécurité approfondi

> Date : Juin 2025  
> Impact : 8 CRITICAL, 6 HIGH, 10 MEDIUM corrigés  
> Tests : 10/10 suites, 89/89 tests — 0 erreurs TypeScript (API + Web)

### Sécurité (CRITICAL)

- **Token invalidation** : Le `refreshToken` inclut désormais un `tokenVersion` validé contre la BDD. Changer ou réinitialiser son mot de passe invalide tous les refresh tokens existants.
- **Race condition wallet** : Les retraits utilisent `SELECT ... FOR UPDATE` dans une transaction interactive Prisma pour verrouiller la ligne wallet et empêcher les doubles retraits concurrents.
- **Webhook idempotence** : Le webhook de payout vérifie que le retrait n'est pas déjà `COMPLETED` avant de le traiter, empêchant les crédits en double.
- **Service Worker** : Les chemins `/dashboard` et `/admin` sont exclus du cache pour empêcher l'accès hors-ligne aux données sensibles.
- **CSP frontend** : Headers de sécurité ajoutés dans `next.config.js` : Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy.
- **Cookie Secure** : Le cookie de referral utilise le flag `Secure` en production.
- **bcrypt 12** : Les salt rounds sont passés de 10 à 12 dans `register()`, `changePassword()` et `resetPassword()`.

### Robustesse (HIGH)

- **Health check 503** : `GET /api/health` retourne `503 Service Unavailable` si la base de données est inaccessible (au lieu de 200 avec erreur).
- **Commission L2 gating** : Les commissions de niveau 2 (10%) ne sont versées que si le bénéficiaire est PREMIUM ou VIP.
- **Expiration tâches** : `completeTask()` vérifie `task.expiresAt` côté serveur (en plus du frontend) et rejette les tâches expirées.
- **SSE cleanup** : Le flux SSE de notifications utilise `.pipe(finalize(...))` pour nettoyer les listeners et timers à la déconnexion du client.
- **Ads total ajusté** : `findActive()` ajuste le total renvoyé pour exclure les publicités dont le budget est épuisé.
- **Admin layout protection** : Le layout admin redirige les non-admin vers `/dashboard` ou `/login`.
- **NotificationBell a11y** : Attributs ARIA (aria-expanded, aria-haspopup, role="menu") et gestion du clavier (Escape pour fermer).

### Qualité de code (MEDIUM)

- **ValidationPipe** : `enableImplicitConversion` supprimé pour empêcher la coercion automatique des types dans les DTOs.
- **Google Auth** : Ne modifie plus le `provider` d'un compte LOCAL existant lors d'une connexion Google (préserve la possibilité de login par mot de passe).
- **Pagination ajoutée** :
  - `GET /api/wallet/withdrawals?page=1&limit=20` — liste paginée des retraits
  - `GET /api/tasks/my-completions?page=1&limit=20` — liste paginée des complétions
- **SanitizeInterceptor** : Limite de profondeur `MAX_DEPTH=16` pour prévenir les stack overflows sur des payloads JSON profondément imbriqués.
- **Ads queries** : Remplacement de `$transaction` par `Promise.all` pour les requêtes read-only (plus simple, aussi correct).
- **Frontend types** : Tous les `any` remplacés par des interfaces typées (`WalletData`, `Transaction`, `FeesData`, `TierPricingData`, `Task`, `Withdrawal`) sur les pages wallet, tasks et withdrawals.
- **Formulaires** : Attributs `autoComplete` ajoutés sur tous les champs (login, register).
- **window.open** : `noopener,noreferrer` ajouté sur tous les appels `window.open()` (wallet, referrals).

---

## [Phase 10] — Audit complet

> Date : Mars 2026

### Corrigé

- **4 CRITICAL** : AdsController (double prefix + user.sub), webhook 200 sur erreur, token frontend obsolète, calcul referrals incorrect
- **8 HIGH** : CSRF blanket exempt, SanitizeInterceptor corrompant Decimal, TMoney mal mappé, auto-ban admin, Tailwind JIT, NEXTAUTH_URL exposé, timeAgo dupliqué, OG metadata
- **12 MEDIUM** : aria-labels admin, labels français statuts, googleAuthPending cleanup, dead code, toast.error dashboard, notifications polling, pagination a11y, task types labels, error boundaries
- **5 LOW** : console.log, ESLint deps, AbortController polling

---

## [Phase 1-4] — Sécurité & Infrastructure

### Ajouté

- Vérification serveur du `idToken` Google (`google-auth-library`)
- Rate limiting multi-palier (`@nestjs/throttler`)
- Helmet complet (CSP, HSTS 1 an, frameguard, referrer-policy)
- Mise à jour des dépendances critiques (nodemailer 8, bcrypt 6, @nestjs/config 4)
- GitHub Actions CI/CD (lint → test → build)
