# XEARN - Guide de deploiement complet

Ce document trace toutes les etapes pour mettre XEARN en production, de A a Z.

---

## Pre-requis

Comptes a creer avant de commencer :
- [ ] GitHub (deja fait si tu lis ceci)
- [ ] Neon (https://console.neon.tech) - base de donnees PostgreSQL
- [ ] Railway (https://railway.app) - backend API
- [ ] Vercel (https://vercel.com) - frontend
- [ ] Sentry (https://sentry.io) - monitoring erreurs
- [ ] FedaPay (https://fedapay.com) - paiements Mobile Money
- [ ] Google Cloud Console - OAuth (https://console.cloud.google.com)
- [ ] Compte email dedie pour SMTP (Gmail ou transactionnel)

Temps estime total : 45-60 minutes

---

## Etape 1 : Base de donnees (Neon) - 5 min

1. Creer un compte sur https://console.neon.tech
2. Nouveau projet : "XEARN Production"
3. Region : EU West (plus proche de l'Afrique de l'Ouest)
4. Copier la connection string :
   ```
   postgresql://[user]:[password]@[host].neon.tech/xearn_prod?sslmode=require
   ```
5. Garder cette URL, c'est le `DATABASE_URL`

**Verification :** La connection string contient `?sslmode=require`

---

## Etape 2 : Google OAuth - 10 min

1. Aller sur https://console.cloud.google.com
2. Creer un nouveau projet "XEARN"
3. APIs & Services > Credentials > Create OAuth Client ID
4. Type : Web application
5. Authorized JavaScript origins :
   - `https://xearn.com`
   - `https://www.xearn.com`
6. Authorized redirect URIs :
   - `https://xearn.com/api/auth/callback/google`
7. Copier `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`

---

## Etape 3 : Sentry - 5 min

1. Creer un compte sur https://sentry.io
2. Creer 2 projets :
   - "xearn-api" (Node.js) -> copier le DSN = `SENTRY_DSN`
   - "xearn-web" (Next.js) -> copier le DSN = `NEXT_PUBLIC_SENTRY_DSN`
3. Configurer les alertes email pour les erreurs critiques

---

## Etape 4 : FedaPay - 10 min

1. Creer un compte sur https://fedapay.com
2. Passer en mode Production (pas sandbox)
3. Recuperer :
   - `FEDAPAY_SECRET_KEY` (cle secrete)
   - `FEDAPAY_PUBLIC_KEY` (cle publique)
4. Configurer le webhook :
   - URL : `https://api.xearn.com/api/payment/webhook`
   - Evenements : transaction.completed, transaction.failed, payout.completed, payout.failed
5. Copier le `FEDAPAY_WEBHOOK_SECRET`

---

## Etape 5 : Deployer le Backend (Railway) - 10 min

1. Aller sur https://railway.app, se connecter avec GitHub
2. New Project > Deploy from GitHub repo > selectionner "XEARN"
3. Railway detecte le monorepo. Configurer :
   - Root Directory : `/` (laisser a la racine)
   - Build Command : (auto via railway.json)
   - Start Command : (auto via railway.json)

4. Ajouter TOUTES les variables d'environnement :

```env
# Core
NODE_ENV=production
DATABASE_URL=postgresql://[...valeur de l'etape 1...]

# JWT - Generer avec : openssl rand -hex 64
JWT_SECRET=[64-chars-hex]
JWT_REFRESH_SECRET=[64-chars-hex]
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Auth
NEXTAUTH_SECRET=[32-chars-hex]
GOOGLE_CLIENT_ID=[valeur etape 2]
GOOGLE_CLIENT_SECRET=[valeur etape 2]

# CORS
CORS_ORIGINS=https://xearn.com,https://www.xearn.com

# URLs
API_URL=https://[ton-app].railway.app
NEXTAUTH_URL=https://xearn.com

# Paiements
PAYMENT_MODE=fedapay
FEDAPAY_ENV=production
FEDAPAY_SECRET_KEY=[valeur etape 4]
FEDAPAY_PUBLIC_KEY=[valeur etape 4]
FEDAPAY_CALLBACK_URL=https://[ton-app].railway.app/api/payment/webhook
FEDAPAY_WEBHOOK_SECRET=[valeur etape 4]

# Business
ACTIVATION_PRICE_FCFA=4000
WITHDRAWAL_MIN_FCFA=2000
PREMIUM_PRICE_FCFA=10000
VIP_PRICE_FCFA=25000
REFERRAL_LEVEL1_PERCENT=40
REFERRAL_LEVEL2_PERCENT=10
REFERRAL_LEVEL3_PERCENT=5

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[email-dedie]
SMTP_PASS=[app-password-16-chars]
SMTP_FROM=XEARN <noreply@xearn.com>

# Monitoring
SENTRY_DSN=[valeur etape 3 - backend]
```

5. Deployer. Attendre 2-3 minutes.
6. Verifier : `curl https://[ton-app].railway.app/api/health`

**Verification :** Le health check retourne `{ "status": "up" }`

---

## Etape 6 : Deployer le Frontend (Vercel) - 5 min

1. Aller sur https://vercel.com, se connecter avec GitHub
2. Import Project > selectionner "XEARN"
3. Framework Preset : Next.js
4. Root Directory : `apps/web`
5. Variables d'environnement :

```env
NEXT_PUBLIC_API_URL=https://[ton-app].railway.app
NEXT_PUBLIC_APP_URL=https://xearn.com
NEXT_PUBLIC_SENTRY_DSN=[valeur etape 3 - frontend]
NEXTAUTH_URL=https://xearn.com
NEXTAUTH_SECRET=[meme valeur que Railway]
GOOGLE_CLIENT_ID=[meme valeur que Railway]
GOOGLE_CLIENT_SECRET=[meme valeur que Railway]
```

6. Deploy. Attendre 1-2 minutes.
7. Verifier : ouvrir l'URL Vercel dans le navigateur

**Verification :** La landing page s'affiche correctement

---

## Etape 7 : DNS (si domaine custom) - 5 min

### Frontend (xearn.com)
1. Dans Vercel > Settings > Domains > Add `xearn.com`
2. Vercel donne les DNS records a configurer
3. Chez ton registrar, ajouter un CNAME : `@ -> cname.vercel-dns.com`

### API (api.xearn.com)
1. Dans Railway > Settings > Networking > Custom Domain > `api.xearn.com`
2. Railway donne le CNAME
3. Chez ton registrar, ajouter : `api -> [railway-cname]`

Propagation DNS : 5 min a 48h selon le registrar.

---

## Etape 8 : Creer le compte admin - 2 min

```bash
# Depuis ta machine locale, avec DATABASE_URL de production :
ADMIN_SEED_PASSWORD="[mot-de-passe-tres-fort-20-chars-min]" \
ADMIN_EMAIL="admin@xearn.com" \
DATABASE_URL="postgresql://[...prod...]" \
npm run db:seed-prod
```

**Verification :** Se connecter sur `https://xearn.com/login` avec les credentials admin

---

## Etape 9 : Tests post-deploiement - 15 min

### Tests automatiques
```bash
node scripts/validate-deployment.js production
```

### Tests manuels (parcours complet)

- [ ] **Landing page** charge correctement
- [ ] **Inscription** par email fonctionne
- [ ] **Email de verification** arrive
- [ ] **Connexion** fonctionne
- [ ] **Dashboard** affiche le solde
- [ ] **Activation compte** (paiement FedaPay 4000 FCFA) fonctionne
- [ ] **Completer une tache** credite le wallet
- [ ] **Retrait** cree une demande de withdrawal
- [ ] **Parrainage** : un filleul inscrit avec un code genere une commission
- [ ] **Notifications** arrivent en temps reel (SSE)
- [ ] **Admin** : tableau de bord accessible
- [ ] **Admin** : analytics affiche les graphiques
- [ ] **Google OAuth** fonctionne
- [ ] **Mot de passe oublie** envoie l'email
- [ ] **Gamification** : streak s'incremente apres une tache
- [ ] **Mobile** : le site est responsive

---

## Etape 10 : Monitoring - 5 min

1. **Sentry** : verifier que les projets capturent les erreurs
   - Provoquer une erreur test (acceder a une route inexistante)
   - Verifier qu'elle apparait dans le dashboard Sentry

2. **Railway logs** : https://railway.app > ton projet > Logs
   - Verifier que l'API log les requetes

3. **Health check** : configurer une alerte si `/api/health` ne repond plus
   - Option : UptimeRobot (gratuit), Better Uptime, ou un cron interne

---

## Choses annexes a faire apres le deploiement

### Semaine 1

- [ ] Configurer les backups automatiques Neon (PITR active par defaut)
- [ ] Ajouter les regles d'alerte Sentry (email si > 10 erreurs/heure)
- [ ] Tester le flow FedaPay avec un vrai paiement (petite somme)
- [ ] Inviter 10-20 beta testeurs
- [ ] Surveiller les logs Railway pour erreurs recurrentes

### Semaine 2

- [ ] Analyser les metriques Sentry (erreurs les plus frequentes)
- [ ] Collecter les retours des beta testeurs
- [ ] Corriger les bugs reportes
- [ ] Elargir a 50-100 utilisateurs

### Mois 1

- [ ] Analyser les analytics admin (quelles taches marchent, quels tiers)
- [ ] Optimiser les performances si necessaire (ajouter des indexes)
- [ ] Planifier la Phase 7 (mobile React Native)
- [ ] Evaluer les couts (Railway + Vercel + Neon)
- [ ] Envisager un service SMTP transactionnel (Resend, Mailgun) si Gmail rate-limite

---

## En cas de probleme

### L'API ne demarre pas sur Railway
1. Verifier les logs Railway
2. Cause probable : variable d'environnement manquante (JWT_SECRET, DATABASE_URL)
3. L'app crash au boot si `JWT_SECRET` ou `JWT_REFRESH_SECRET` manquent

### Le frontend ne se connecte pas a l'API
1. Verifier `NEXT_PUBLIC_API_URL` dans Vercel
2. Verifier CORS : `CORS_ORIGINS` doit inclure le domaine Vercel
3. Redeploy Vercel apres changement d'env var

### Les paiements FedaPay ne marchent pas
1. Verifier `PAYMENT_MODE=fedapay` (pas `mock`)
2. Verifier que l'URL de webhook est accessible publiquement
3. Tester le webhook : `curl -X POST https://api.xearn.com/api/payment/webhook`

### Erreur "CSRF token invalide"
1. Verifier que `CORS_ORIGINS` inclut le bon domaine (avec https://)
2. Verifier que les cookies sont transmis (credentials: include)

### La base de donnees ne se connecte pas
1. Verifier le format : `postgresql://user:pass@host/db?sslmode=require`
2. Verifier que l'IP Railway n'est pas bloquee dans Neon (pas de whitelist par defaut)

---

## Rollback

### Rollback API (Railway)
1. Railway > Deployments > cliquer sur le deploy precedent > Redeploy

### Rollback Frontend (Vercel)
1. Vercel > Deployments > cliquer sur le deploy precedent > Promote to Production

### Rollback base de donnees
1. Neon > Branches > Point-in-Time Recovery (selectionner un timestamp avant le probleme)

---

## Contacts et liens utiles

| Service | Dashboard |
|---------|-----------|
| Railway | https://railway.app/dashboard |
| Vercel | https://vercel.com/dashboard |
| Neon | https://console.neon.tech |
| Sentry | https://sentry.io |
| FedaPay | https://app.fedapay.com |
| GitHub Actions | https://github.com/iruzen-dono/XEARN/actions |

---

Derniere mise a jour : Mai 2026
