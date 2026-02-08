'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, ListTodo, Users, Wallet, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tâches', icon: ListTodo },
  { href: '/dashboard/referrals', label: 'Parrainage', icon: Users },
  { href: '/dashboard/wallet', label: 'Portefeuille', icon: Wallet },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-dark-800 p-6 flex flex-col fixed h-full">
        <Link href="/" className="flex items-center gap-2 mb-10">
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

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
