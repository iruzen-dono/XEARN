'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  LayoutDashboard,
  ListTodo,
  Users,
  Wallet,
  LogOut,
  Menu,
  X,
  UserCircle,
  Bell,
  Megaphone,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import NotificationBell from '@/components/NotificationBell';
import PageTransition from '@/components/ui/PageTransition';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/dashboard/referrals', label: 'Parrainage', icon: Users },
  { href: '/dashboard/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/dashboard/ads', label: 'Mes Publicités', icon: Megaphone },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'Mon profil', icon: UserCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 mb-10"
        onClick={() => setSidebarOpen(false)}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-lg bg-primary-500/10 ring-1 ring-primary-500/20" />
          <Zap className="relative w-7 h-7 text-primary-300" />
        </div>
        <span className="text-xl font-extrabold gradient-text">XEARN</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-white bg-primary-500/10 border border-primary-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-primary-400 to-accent-400"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-400' : 'group-hover:text-white'}`}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-primary-400/50" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="pt-4 border-t border-white/[0.06] mt-4">
        <div className="px-4 py-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate text-white">
              {user?.firstName} {user?.lastName}
            </div>
            {user?.tier && user.tier !== 'NORMAL' && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  user.tier === 'VIP'
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30'
                }`}
              >
                {user.tier}
              </span>
            )}
          </div>
          <div className="text-xs text-dark-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-2xl border-b border-white/[0.06] h-14 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary-500/10 ring-1 ring-primary-500/20" />
            <Zap className="relative w-6 h-6 text-primary-300" />
          </div>
          <span className="text-lg font-bold gradient-text">XEARN</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Fermer le menu latéral' : 'Ouvrir le menu latéral'}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        id="dashboard-sidebar"
        className={`
          fixed top-0 left-0 h-full w-64 bg-dark-900/95 backdrop-blur-2xl
          border-r border-white/[0.06] p-6 flex flex-col z-50
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-white/[0.06] bg-dark-950/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="text-sm text-dark-400">
            Bonjour, <span className="text-white font-medium">{user?.firstName}</span>
          </div>
          <NotificationBell />
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* H5: Block content for BANNED/SUSPENDED users */}
          {user?.status === 'SUSPENDED' ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full p-8 rounded-2xl bg-warning-500/10 border border-warning-500/20 text-center"
              >
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-warning-400 mb-2">Compte suspendu</h2>
                <p className="text-warning-400/70 text-sm">
                  Votre compte est actuellement suspendu. Toutes les fonctionnalités sont
                  restreintes. Veuillez contacter le support pour plus d&apos;informations.
                </p>
              </motion.div>
            </div>
          ) : user?.status === 'BANNED' ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full p-8 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-center"
              >
                <div className="text-4xl mb-4">🚫</div>
                <h2 className="text-xl font-bold text-danger-400 mb-2">Compte banni</h2>
                <p className="text-danger-400/70 text-sm">
                  Votre compte a été désactivé de façon permanente. Vous ne pouvez plus accéder aux
                  fonctionnalités de la plateforme.
                </p>
              </motion.div>
            </div>
          ) : (
            <PageTransition>{children}</PageTransition>
          )}
        </div>
      </main>
    </div>
  );
}
