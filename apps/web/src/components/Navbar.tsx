'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Menu, X } from 'lucide-react';

const links = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#how-it-works', label: 'Comment ça marche' },
  { href: '#pricing', label: 'Tarifs' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary-400" />
            <span className="text-2xl font-bold gradient-text">XEARN</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-dark-300 hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>

          {/* Desktop auth buttons + mobile hamburger */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm py-2 px-4 hidden sm:inline-flex">Connexion</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">S&apos;inscrire</Link>
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-dark-400 hover:text-white">
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-dark-900 border-t border-dark-800">
          <div className="px-4 py-4 space-y-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-dark-300 hover:text-white py-2 transition-colors">{l.label}</a>
            ))}
            <hr className="border-dark-800" />
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="btn-secondary text-sm py-2 px-4 flex-1 text-center">Connexion</Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-4 flex-1 text-center">S&apos;inscrire</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
