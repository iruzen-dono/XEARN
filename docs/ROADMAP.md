# XEARN — Feuille de Route

> Plateforme panafricaine de micro-revenus digitaux  
> Dernière mise à jour : Mars 2026

---

## État actuel du projet

| Composant | Stack | Statut |
|-----------|-------|--------|
| **Backend API** | NestJS 10 + Prisma 6.19 + PostgreSQL 16 | ✅ Build propre (0 erreurs) |
| **Frontend Web** | Next.js 15.5 + React 19 + TailwindCSS 3.4 | ✅ Build propre (0 erreurs, 0 warnings) |
| **Auth** | JWT httpOnly cookies + CSRF double-submit + NextAuth (Google) | ✅ Fonctionnel |
| **Niveaux de compte** | Normal / Premium / VIP avec upgrade payant | ✅ Implémenté |
| **Parrainage 3 niveaux** | L1: 40%, L2: 10%, L3 VIP: 5% | ✅ Implémenté |
| **Publicités ciblées** | Rôle Partenaire, ciblage pays/tier, budget | ✅ Implémenté |
| **Paiements** | FedaPay (MTN, Moov, TMoney) | ✅ Intégré |
| **Design** | Premium dark theme + framer-motion + recharts + Radix UI | ✅ Complet |
| **PWA** | Service Worker + Manifest | ✅ Basique |
| **Tests** | Jest (7 suites, 60 tests backend) + Playwright (frontend smoke) | ✅ Fonctionnel |
| **CI/CD** | Non configuré | ❌ À faire |
| **Déploiement** | Docker Compose (dev) | ⚠️ Pas de production |

### Corrections effectuées (Phase 10 - Audit complet)

**4 CRITICAL** — AdsController cassé (double prefix + user.sub), webhook renvoyant 200 sur erreur, token frontend obsolète, calcul referrals incorrect

**8 HIGH** — CSRF blanket exempt (logout exposé), SanitizeInterceptor corrompant Decimal, TMoney mal mappé, auto-ban admin, dynamic Tailwind JIT, NEXTAUTH_URL exposé côté client, timeAgo dupliqué, OG metadata manquant

**12 MEDIUM** — aria-label sur tous les boutons icônes admin, labels français pour statuts (users/tasks), googleAuthPending non nettoyé à l'échec, dead code `data.data` supprimé, toast.error sur erreur dashboard, notifications polling avec cancel flag, pagination a11y, task types labels, error boundaries (dashboard + admin)

**5 LOW** — Suppression console.log inutiles, ESLint deps fixes, AbortController polling

---

## Phase 1 — Sécurité & Robustesse (Priorité: HAUTE)

### 1.1 Validation Google Auth côté serveur
- [ ] Installer `google-auth-library`
- [ ] Vérifier le `idToken` Google côté backend (`OAuth2Client.verifyIdToken`)
- [ ] Supprimer la confiance aveugle dans le payload Google envoyé par le frontend
- **Impact**: Empêche la création de comptes avec des tokens Google falsifiés

### 1.2 Rate Limiting avancé
- [ ] Ajouter `@nestjs/throttler` avec des limites par route
- [ ] Rate limit strict sur `/api/auth/login` (5 req/min), `/api/auth/register` (3 req/min)
- [ ] Rate limit modéré sur `/api/tasks/complete` (anti-farming)
- [ ] Rate limit sur `/api/payment/webhook` (protection DDoS)

### 1.3 Helmet & Headers de sécurité
- [ ] Vérifier la configuration `helmet()` existante
- [ ] Ajouter `Content-Security-Policy` strict
- [ ] Ajouter `Permissions-Policy` (désactiver camera, microphone, geolocation)
- [ ] `X-Content-Type-Options: nosniff` sur toutes les réponses

### 1.4 Audit de sécurité des dépendances
- [ ] Exécuter `npm audit` et résoudre les vulnérabilités HIGH/CRITICAL
- [ ] Configurer Dependabot ou Renovate pour les mises à jour automatiques

---

## Phase 2 — Qualité du code (Priorité: HAUTE)

### 2.1 Typage TypeScript strict
- [ ] Remplacer tous les `any` par des types/interfaces explicites (30+ occurrences)
- [ ] Créer un fichier `types/` partagé (ou package `@xearn/types`)
- [ ] Ajouter `strict: true` dans les tsconfig (si pas déjà fait)
- [ ] Typer les réponses API avec des interfaces côté frontend

### 2.2 Tests unitaires backend
- [ ] Atteindre 80% de couverture sur les services critiques:
  - `payment.service.ts` — flux de paiement et remboursement
  - `wallet.service.ts` — solde, activation, retrait
  - `referrals.service.ts` — arbre, commissions
  - `anti-cheat.service.ts` — détection de fraude
- [ ] Ajouter des tests d'intégration avec une base de test (Prisma + testcontainers)

### 2.3 Tests E2E frontend
- [ ] Étendre Playwright au-delà du smoke test actuel
- [ ] Scénarios critiques: inscription → activation → tâche → retrait
- [ ] Tests admin: gestion utilisateurs, approbation publicités
- [ ] Tests responsive (mobile viewport)

### 2.4 Linting & Formatting
- [ ] Configurer ESLint strict (unused imports, no-explicit-any)
- [ ] Ajouter Prettier avec config partagée
- [ ] git pre-commit hook (`husky` + `lint-staged`)

---

## Phase 3 — Fonctionnalités (Priorité: MOYENNE)

### 3.1 Système de notifications push
- [ ] Web Push API (notifications navigateur)
- [ ] Gestion des abonnements push côté backend
- [ ] Notification en temps réel (SSE ou WebSocket) au lieu de polling toutes les 30s
- [ ] Préférences utilisateur (opt-in/opt-out par type)

### 3.2 Tableau de bord admin avancé
- [ ] Graphiques analytiques en temps réel (revenus, inscriptions, tâches)
- [ ] Export CSV des utilisateurs, transactions, retraits
- [ ] Logs d'activité admin (qui a banni/suspendu qui)
- [ ] Système de recherche full-text sur tout le contenu

### 3.3 Système de publicités complet
- [x] Relation FK `Advertisement.publisherId → User.id` dans le schéma Prisma
- [ ] Dashboard annonceur (stats de vues/clics)
- [x] Budget et facturation des publicités
- [x] Ciblage géographique (par pays) et par tier de compte
- [x] Rôle PARTNER (Pub Maker) pour créer des publicités

### 3.4 Code de parrainage Google Auth
- [ ] Permettre de transmettre le code parrain lors de l'inscription via Google
- [ ] Stocker le referral code dans sessionStorage avant le redirect OAuth
- [ ] L'envoyer au backend lors de la synchronisation du token Google

### 3.5 Gamification
- [x] Système de niveaux de compte (Normal / Premium / VIP) avec avantages progressifs
- [ ] Système de badges
- [ ] Classement (leaderboard) hebdomadaire
- [ ] Challenges quotidiens/hebdomadaires avec des récompenses bonus
- [ ] Streak system (jours consécutifs d'activité)

---

## Phase 4 — Performance & Scalabilité (Priorité: MOYENNE)

### 4.1 Cache & Optimisation
- [ ] Redis pour le cache des sessions, rate limiting et données fréquentes
- [ ] Cache API côté frontend (`stale-while-revalidate` avec SWR ou React Query)
- [ ] Optimistic updates pour les actions qui modifient l'état (compléter tâche, lire notification)
- [ ] Images: utiliser `next/image` avec optimisation automatique

### 4.2 Base de données
- [ ] Ajouter des index composites Prisma sur les requêtes fréquentes
- [ ] Pagination cursor-based au lieu de offset-based pour les grandes listes
- [ ] Soft delete pour les transactions et users (au lieu de hard delete)
- [ ] Replica en lecture seule pour les dashboards analytics

### 4.3 Landing page SSR
- [ ] Convertir la landing page (`/`) en Server Component pur
- [ ] Supprimer `'use client'` de la page d'accueil
- [ ] Pré-rendu statique (ISR) pour un TTFB < 200ms

### 4.4 Bundle size
- [ ] Auditer et tree-shake les imports Lucide (import nommé au lieu du barrel)
- [ ] Lazy load recharts et framer-motion (dynamic imports)
- [ ] Analyser avec `@next/bundle-analyzer`

---

## Phase 5 — DevOps & Déploiement (Priorité: HAUTE pour production)

### 5.1 CI/CD Pipeline
- [ ] GitHub Actions: lint → test → build → deploy
- [ ] Environnements: `staging` et `production`
- [ ] Migrations Prisma automatiques au déploiement
- [ ] Rollback automatique si le health check échoue

### 5.2 Infrastructure production
- [ ] Backend: VPS (Railway, Render, ou serveur dédié) avec PM2 ou Docker
- [ ] Frontend: Vercel (recommandé pour Next.js) ou Cloudflare Pages
- [ ] Base de données: PostgreSQL managé (Supabase, Neon, ou Railway)
- [ ] Redis managé pour cache et rate limiting

### 5.3 Monitoring & Observabilité
- [ ] APM: Sentry pour le tracking d'erreurs (backend + frontend)
- [ ] Logs structurés (déjà en place) → exporter vers un agrégateur (Loki, Datadog)
- [ ] Health check endpoint `/api/health` avec vérification DB
- [ ] Uptime monitoring (UptimeRobot, Better Stack)
- [ ] Alertes Slack/Telegram pour les erreurs critiques et les paiements échoués

### 5.4 Sécurité production
- [ ] Variables d'environnement sécurisées (vault ou secrets manager)
- [ ] HTTPS obligatoire + HSTS
- [ ] Backup automatique de la base de données (quotidien)
- [ ] Rotation des secrets JWT périodique

---

## Phase 6 — Mobile & Expansion (Priorité: FUTURE)

### 6.1 Application mobile
- [ ] React Native ou Expo (réutilisation maximale du code)
- [ ] Notifications push natives
- [ ] Authentification biométrique
- [ ] Mode hors-ligne basique

### 6.2 Internationalisation
- [ ] `next-intl` pour le support multilingue
- [ ] Langues cibles: Français, Anglais, Portugais (marchés africains)
- [ ] Localisation des formats monétaires (FCFA, GHS, NGN)

### 6.3 Moyens de paiement additionnels
- [ ] Orange Money (via FedaPay ou intégration directe)
- [ ] Airtel Money
- [ ] Wave (très populaire en Afrique de l'Ouest)
- [ ] Intégration bancaire directe (pour les gros retraits)

### 6.4 API publique
- [ ] Documentation OpenAPI/Swagger pour les annonceurs
- [ ] SDK annonceurs (créer/gérer des campagnes par API)
- [ ] Webhooks annonceurs (événements de complétion)

---

## Métriques de succès

| Métrique | Objectif Phase 1-2 | Objectif Phase 3-4 | Objectif Phase 5-6 |
|----------|--------------------|--------------------|---------------------|
| Couverture tests | 60% | 80% | 90% |
| Build time | < 30s | < 20s | < 15s |
| TTFB (landing) | < 500ms | < 200ms | < 100ms |
| Taux d'erreur API | < 2% | < 0.5% | < 0.1% |
| Utilisateurs actifs | 100 | 5 000 | 50 000+ |
| Disponibilité | 95% | 99% | 99.9% |

---

## Dettes techniques connues

| Élément | Fichier(s) | Sévérité | Description |
|---------|-----------|----------|-------------|
| Google Auth non vérifié serveur | `auth.service.ts` | **CRITIQUE** | Le `idToken` Google n'est pas vérifié côté serveur — un attaquant peut fabriquer un token |
| `any` omniprésent | 30+ fichiers | HAUTE | ~50 occurrences de `any` dans le frontend, types manquants |
| Advertisement sans FK | `schema.prisma` | ~~MOYENNE~~ | ~~`publisherId` est un String libre~~ → **Résolu** : publisherId lié à User |
| Landing page `'use client'` | `app/page.tsx` | BASSE | La landing 7KB JS pourrait être un Server Component pur (0 JS) |
| PWA sans versioning | `public/sw.js` | BASSE | Le service worker ne gère pas les versions de cache |
| Polling notifications | `NotificationBell.tsx` | BASSE | Polling 30s → remplacer par SSE/WebSocket |

---

*Document généré automatiquement après l'audit complet Phase 10 du projet XEARN.*
