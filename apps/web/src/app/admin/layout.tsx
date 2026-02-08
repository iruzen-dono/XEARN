'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, Users, ListTodo, Wallet, BarChart3, LogOut } from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/admin/transactions', label: 'Transactions', icon: Wallet },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-dark-900 border-r border-dark-800 p-6 flex flex-col fixed h-full">
        <Link href="/admin" className="flex items-center gap-2 mb-2">
          <Zap className="w-8 h-8 text-primary-400" />
          <span className="text-xl font-bold gradient-text">XEARN</span>
        </Link>
        <span className="text-xs text-dark-500 mb-8 ml-10">ADMIN</span>

        <nav className="flex-1 space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </aside>

      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
