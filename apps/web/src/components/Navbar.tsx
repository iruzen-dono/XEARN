'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X, ArrowRight } from 'lucide-react';

const links = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#how-it-works', label: 'Comment ça marche' },
  { href: '#pricing', label: 'Tarifs' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-dark-950/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-lg blur-lg group-hover:bg-primary-500/30 transition-all" />
              <Zap className="relative w-8 h-8 text-primary-400" />
            </div>
            <span className="text-2xl font-extrabold gradient-text">XEARN</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative px-4 py-2 text-sm font-medium text-dark-300 hover:text-white transition-colors group"
              >
                {l.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-2/3 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Desktop auth buttons + mobile hamburger */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm py-2 px-4 hidden sm:inline-flex">
              Connexion
            </Link>
            <Link href="/register" className="btn-primary btn-sm hidden sm:inline-flex group">
              Commencer
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-dark-900/95 backdrop-blur-2xl border-t border-white/[0.06]"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="block text-dark-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/5 transition-all text-sm font-medium"
                >
                  {l.label}
                </motion.a>
              ))}
              <div className="divider my-3" />
              <div className="flex gap-3 pt-1">
                <Link href="/login" className="btn-secondary btn-sm flex-1 text-center" onClick={() => setOpen(false)}>
                  Connexion
                </Link>
                <Link href="/register" className="btn-primary btn-sm flex-1 text-center" onClick={() => setOpen(false)}>
                  S&apos;inscrire
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
