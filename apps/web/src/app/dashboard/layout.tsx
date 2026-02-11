'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, ListTodo, Users, Wallet, LogOut, Menu, X, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/dashboard/referrals', label: 'Parrainage', icon: Users },
  { href: '/dashboard/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/dashboard/profile', label: 'Mon profil', icon: UserCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const sidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2 mb-10" onClick={() => setSidebarOpen(false)}>
        <Zap className="w-8 h-8 text-primary-400" />
        <span className="text-xl font-bold gradient-text">XEARN</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-dark-800 mt-4">
        <div className="px-4 py-2 mb-2">
          <div className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
          <div className="text-xs text-dark-500 truncate">{user?.email}</div>
        </div>
        <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800 h-14 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary-400" />
          <span className="text-lg font-bold gradient-text">XEARN</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-dark-400 hover:text-white">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop: fixed, mobile: slide-over */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-dark-900 border-r border-dark-800 p-6 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop top bar with notification bell */}
        <div className="hidden lg:flex items-center justify-end px-8 py-4 border-b border-dark-800">
          <NotificationBell />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
