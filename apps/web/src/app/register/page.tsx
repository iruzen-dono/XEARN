'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Zap, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-dark-400">Chargement...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    referralCode: refCode,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(form);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent" />
      <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

      <div className="card max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Zap className="w-8 h-8 text-primary-400" />
            <span className="text-2xl font-bold gradient-text">XEARN</span>
          </Link>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-dark-400 mt-2">Rejoignez la communauté XEARN</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Jean"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Nom</label>
              <input
                type="text"
                className="input-field"
                placeholder="Dupont"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-dark-300 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="email"
                className="input-field pl-10"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-dark-300 mb-1 block">Téléphone (optionnel)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="tel"
                className="input-field pl-10"
                placeholder="+228 90 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-dark-300 mb-1 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pl-10 pr-10"
                placeholder="Min. 6 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-dark-300 mb-1 block">Code de parrainage (optionnel)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Entrez un code de parrainage"
              value={form.referralCode}
              onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
              readOnly={!!refCode}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-dark-400 mt-6">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
