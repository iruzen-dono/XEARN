# Guide de Migration — Pattern SWR Standardisé

## 🎯 Objectif

Migrer toutes les pages dashboard du pattern `useEffect + useState` vers les hooks SWR standardisés.

---

## 📋 Checklist des pages à migrer

- [x] `apps/web/src/app/dashboard/wallet/page.tsx` ✅ (exemple fourni dans `page.refactored.tsx`)
- [ ] `apps/web/src/app/dashboard/tasks/page.tsx`
- [ ] `apps/web/src/app/dashboard/referrals/page.tsx`
- [ ] `apps/web/src/app/dashboard/page.tsx` (main dashboard)

---

## 🔄 Pattern de migration

### Avant (ancien pattern)
```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await api.get('/endpoint');
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error.message}</div>;
  if (!data) return <div>Aucune donnée</div>;

  return <div>{/* Render data */}</div>;
}
```

### Après (nouveau pattern)
```tsx
'use client';

import { useWallet } from '@/lib/hooks';
import { ErrorBoundary, DataError, LoadingSpinner } from '@/components/ErrorBoundary';

export default function MyPage() {
  const { wallet, isLoading, error, refresh } = useWallet();

  if (isLoading) return <LoadingSpinner message="Chargement..." />;
  if (error) return <DataError message={error.message} onRetry={refresh} />;
  if (!wallet) return <DataError message="Aucune donnée" onRetry={refresh} />;

  return (
    <ErrorBoundary>
      <div>{/* Render wallet */}</div>
    </ErrorBoundary>
  );
}
```

---

## 📝 Étapes de migration

### 1. Identifier le hook correspondant

| Page | Endpoint API | Hook SWR |
|------|--------------|----------|
| `dashboard/wallet` | `/wallet` | `useWallet()` |
| `dashboard/tasks` | `/tasks` | `useTasks()` |
| `dashboard/referrals` | `/referrals/tree` | `useReferrals()` |
| `dashboard` (main) | `/users/me` | `useDashboard()` |

### 2. Remplacer les imports
```tsx
// ❌ Supprimer
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

// ✅ Ajouter
import { useWallet } from '@/lib/hooks';
import { ErrorBoundary, DataError, LoadingSpinner } from '@/components/ErrorBoundary';
```

### 3. Remplacer le state management
```tsx
// ❌ Ancien
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  // fetch logic...
}, []);

// ✅ Nouveau
const { wallet, isLoading, error, refresh } = useWallet();
```

### 4. Remplacer les conditions de rendu
```tsx
// ❌ Ancien
if (loading) return <div className="spinner">Chargement...</div>;
if (error) return <div className="error">{error.message}</div>;

// ✅ Nouveau
if (isLoading) return <LoadingSpinner message="Chargement du portefeuille..." />;
if (error) return <DataError message={error.message} onRetry={refresh} />;
```

### 5. Wrapper le contenu dans ErrorBoundary
```tsx
// ✅ Nouveau
return (
  <ErrorBoundary>
    <div className="container">
      {/* Votre contenu */}
    </div>
  </ErrorBoundary>
);
```

### 6. Utiliser `refresh()` pour les actions
```tsx
// ❌ Ancien
const handleAction = async () => {
  await api.post('/action');
  // Re-fetch manuellement
  fetchData();
};

// ✅ Nouveau
const handleAction = async () => {
  await api.post('/action');
  refresh(); // Auto-refresh depuis le cache SWR
};
```

---

## 🎨 Composants UI standardisés

### LoadingSpinner
```tsx
<LoadingSpinner message="Chargement des tâches..." />
```

### DataError
```tsx
<DataError 
  message="Impossible de charger les données" 
  onRetry={refresh} 
/>
```

### ErrorBoundary
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Avec fallback custom :
```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Erreur personnalisée</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Réessayer</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

---

## 🔧 Hooks disponibles

### useWallet()
```tsx
const { wallet, recentWithdrawals, fees, isLoading, error, refresh } = useWallet();
```

**Retourne** :
- `wallet`: `Wallet | undefined`
- `recentWithdrawals`: `Withdrawal[]`
- `fees`: `FeesInfo | undefined`
- `isLoading`: `boolean`
- `error`: `ApiError | undefined`
- `refresh`: `() => Promise<void>`

**Auto-refresh** : 30s

---

### useTasks()
```tsx
const { tasks, isLoading, error, refresh } = useTasks();
```

**Retourne** :
- `tasks`: `Task[]`
- `isLoading`: `boolean`
- `error`: `ApiError | undefined`
- `refresh`: `() => Promise<void>`

**Auto-refresh** : 60s

---

### useTask(slug)
```tsx
const { task, isLoading, error } = useTask('slug-de-la-tache');
```

**Retourne** :
- `task`: `Task | undefined`
- `isLoading`: `boolean`
- `error`: `ApiError | undefined`

**Auto-refresh** : Non (tâche spécifique)

---

### useReferrals()
```tsx
const { level1, level2, level3, stats, isLoading, error, refresh } = useReferrals();
```

**Retourne** :
- `level1`, `level2`, `level3`: `ReferralUser[]`
- `stats`: `{ totalReferrals, activeReferrals, totalCommissions }`
- `isLoading`: `boolean`
- `error`: `ApiError | undefined`
- `refresh`: `() => Promise<void>`

**Auto-refresh** : 60s

---

### useDashboard()
```tsx
const { user, wallet, stats, recentTasks, isLoading, error, refresh } = useDashboard();
```

**Retourne** :
- `user`: `User | undefined`
- `wallet`: `Wallet | undefined`
- `stats`: `{ totalEarned, todayEarnings, pendingWithdrawals, activeReferrals }`
- `recentTasks`: `TaskCompletion[]`
- `isLoading`: `boolean`
- `error`: `ApiError | undefined`
- `refresh`: `() => Promise<void>`

**Auto-refresh** : 30s

---

## ⚠️ Pièges à éviter

### 1. Ne pas oublier le ErrorBoundary
```tsx
// ❌ Sans ErrorBoundary
return <div>{wallet.balance}</div>; // Peut crasher si wallet est undefined

// ✅ Avec ErrorBoundary
return (
  <ErrorBoundary>
    <div>{wallet?.balance ?? 0}</div>
  </ErrorBoundary>
);
```

### 2. Gérer les données nullables
```tsx
// ❌ Crash si undefined
const total = wallet.balance + 100;

// ✅ Safe
const total = (wallet?.balance ?? 0) + 100;
```

### 3. Utiliser refresh() après les mutations
```tsx
// ❌ Les données ne se rafraîchissent pas
await api.post('/tasks/complete', { taskId });

// ✅ Refresh automatique
await api.post('/tasks/complete', { taskId });
refresh(); // Ou refreshTasks() selon le hook
```

---

## 📊 Avantages du nouveau pattern

| Aspect | Avant | Après |
|--------|-------|-------|
| **Lines of code** | ~150 lignes | ~80 lignes (-47%) |
| **Auto-refresh** | ❌ Manuel | ✅ Automatique |
| **Cache** | ❌ Aucun | ✅ Deduping intégré |
| **Error handling** | ⚠️ Incohérent | ✅ Unifié |
| **Type safety** | ⚠️ Partiel (`as unknown`) | ✅ Complet |
| **Revalidation on focus** | ❌ Non | ✅ Oui |
| **Loading states** | ⚠️ Custom | ✅ Standardisé |

---

## 🧪 Testing

### Tester un hook SWR
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useWallet } from '@/lib/hooks';

test('useWallet returns wallet data', async () => {
  const { result } = renderHook(() => useWallet());

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  
  expect(result.current.wallet).toBeDefined();
  expect(result.current.error).toBeUndefined();
});
```

---

## 📚 Ressources

- [SWR Documentation](https://swr.vercel.app/)
- [Error Boundary Pattern](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [STABILISATION_REPORT.md](./STABILISATION_REPORT.md) — Rapport complet de stabilisation

---

**Dernière mise à jour** : 2026-05-17  
**Par** : Claude Sonnet 4.5
