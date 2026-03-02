'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  LayoutDashboard,
  Users,
  ListTodo,
  Wallet,
  LogOut,
  Menu,
  X,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageTransition } from '@/components/ui';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/admin/transactions', label: 'Transactions', icon: Wallet },
  { href: '/admin/ads', label: 'Publicités', icon: Megaphone },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // H11 fix: Redirect non-admin users to dashboard instead of showing blank page
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  const sidebarContent = (
    <>
      <div className="mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 mb-1"
          onClick={() => setSidebarOpen(false)}
        >
          <Zap className="w-8 h-8 text-primary-400" />
          <span className="text-xl font-bold gradient-text">XEARN</span>
        </Link>
        <span className="text-[10px] ml-10 px-2 py-0.5 rounded-md bg-accent-500/15 text-accent-400 font-semibold tracking-wider uppercase">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {adminNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? 'text-white' : 'text-dark-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-sidebar-active"
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/15 to-accent-500/10 border border-primary-500/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 relative z-10 ${isActive ? 'text-primary-400' : ''}`}
              />
              <span className="font-medium relative z-10">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-primary-400" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-white/[0.06] mt-4">
        <div className="px-4 py-2 mb-2">
          <div className="text-sm font-medium truncate text-white">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-xs text-dark-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-950/80 backdrop-blur-2xl border-b border-white/[0.06] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary-400" />
          <span className="text-lg font-bold gradient-text">XEARN</span>
          <span className="text-[10px] bg-accent-500/15 text-accent-400 px-1.5 py-0.5 rounded font-semibold">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-dark-400 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
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
        className={`
        fixed top-0 left-0 h-full w-64 bg-dark-950/95 backdrop-blur-2xl border-r border-white/[0.06] p-6 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
