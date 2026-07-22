'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, Users, ScrollText, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageTransition } from '@/components/ui';

const adminTabs = [
  {
    href: '/dashboard/admin/stats',
    label: 'Statistiques',
    icon: BarChart3,
    description: 'KPIs, graphiques et tendances',
  },
  {
    href: '/dashboard/admin/users',
    label: 'Utilisateurs',
    icon: Users,
    description: 'Gestion des comptes',
  },
  {
    href: '/dashboard/admin/logs',
    label: 'Audit Logs',
    icon: ScrollText,
    description: 'Traçabilité des actions',
  },
];

export default function DashboardAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    setAuthorized(true);
  }, [isLoading, isAuthenticated, user?.role, router]);

  // Redirect /dashboard/admin to /dashboard/admin/stats
  useEffect(() => {
    if (pathname === '/dashboard/admin') {
      router.replace('/dashboard/admin/stats');
    }
  }, [pathname, router]);

  if (isLoading || !authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-primary-400" />
          <h1 className="heading-lg">Administration</h1>
        </div>
        <p className="text-dark-400 text-sm">
          Gérez la plateforme — utilisateurs, statistiques et audit
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {adminTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative overflow-hidden group rounded-xl border p-4 transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/10 border-primary-500/30 shadow-glow'
                  : 'bg-dark-850 border-dark-700 hover:border-dark-600 hover:bg-dark-800/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-active-tab"
                  className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-dark-800 text-dark-400 group-hover:text-dark-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold text-sm ${
                      isActive ? 'text-primary-300' : 'text-dark-200'
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div className="text-xs text-dark-500 mt-0.5 truncate">{tab.description}</div>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
