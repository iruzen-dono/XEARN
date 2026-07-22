# Changelog — XEARN

Toutes les modifications notables du projet sont documentées dans ce fichier.

---

## [Phase 7-8-9] — Admin Panel + Mobile Polish + Gamification API

> Date : Juillet 2026
> Commit : `cb51a17`
> Tests : 12 suites, 99 tests — Builds API + Web ✅

### 🔴 Admin Panel Web
- **3 nouvelles pages** dans `/dashboard/admin/` :
  - **Stats** : 8 KPIs (utilisateurs, activés, premium, revenus, retraits, tâches, suspendus, bannis) + barres inscription 30j animées + top tâches/parrains
  - **Utilisateurs** : Tableau complet avec recherche (debounce), filtres statut, pagination, avatars initials, badges colorés, 3 actions (activer/suspendre/bannir) avec confirmation modale
  - **Audit Logs** : Tableau avec filtre par action (15+ types), affichage dates relatives, pagination
- **3 endpoints API admin** : `GET /admin/users`, `/admin/stats` (cache 60s), `/admin/logs`
- Relation Prisma `AuditLog.admin → User` ajoutée

### 🟡 Mobile Polish
- **LayoutAnimation** transitions fluides entre tabs (easeInEaseOut 200ms)
- LayoutAnimation Android enabled (`UIManager.setLayoutAnimationEnabledExperimental`)
- Imports nettoyés

### 🟢 Gamification API
- Endpoints fonctionnels : `GET /gamification/streak`, `/badges`, `/leaderboard`
- 16 badges (4 catégories : streak, tasks, referrals, earnings)
- Streak tracking avec daily reward cap (10 000 FCFA/jour)
- Vérifications atomiques (SELECT FOR UPDATE)

---

## [Phase 4-5-6] — Mobile App + Performance + Accessibilité

> Date : Juillet 2026
> Commit : `b195285` + `4fbb5ad`
> Stats : 21 fichiers, +3 291 lignes

### Phase 4 — Load Testing & Cache
- **Autocannon** : script load test + npm scripts `load-test`/`load-test:stress`
- **Slow query detection** : Prisma `$on('query')` >100ms avec logger dédié
- **Redis cache ready** : KeyvAdapter + createKeyv (fallback mémoire si REDIS_URL absente)

### Phase 5 — UX/UI & Accessibilité
- **WCAG 2.1 AA** : focus-visible global, skip-to-content link, aria-labels, semantic HTML
- **Loading states** : 3 loading.tsx (dashboard, wallet, tasks)
- **Bundle analysis** : @next/bundle-analyzer configuré
- **Coverage config** : Jest avec seuils (branches 70%, lines 80%)

### Phase 6 — App Mobile Expo
- **Refonte complète** : 12 fichiers, +3 291 lignes, −959
- **Stack** : Expo SDK 52, Reanimated v3, TypeScript strict
- **Fondations** :
  - `theme/index.ts` — Design tokens premium (palette #0c1222, or #F5A623, vert #10B981)
  - `utils/responsive.ts` — scale/moderateScale/useResponsive (breakpoints 360px/480px)
  - `components/Animated.tsx` — 7 composants (AnimatedNumber, AnimatedBalance, AnimatedCard, Shimmer, DashboardSkeleton, PulsingDot)
  - `babel.config.js` — Plugin Reanimated activé
- **Écrans refaits** : Dashboard (balance pulse, cartes glissantes, skeleton shimmer), Wallet (compteurs animés, stats mensuelles, tiers Premium/VIP), Tâches (cards badges type/tier, entrée progressive), Parrainage (code copiable, réseau animé, commissions), Plus (avatar cerclé, streak flamme, badges scrollables, notifs pulsantes)
- **Responsive** : s'adapte à tous les écrans (petits téléphones → tablettes)

---
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
