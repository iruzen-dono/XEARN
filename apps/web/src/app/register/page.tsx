'use client';

import { useState, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, Gift } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  if (!password) return null;

  const colors = ['bg-danger-500', 'bg-danger-400', 'bg-warning-500', 'bg-success-500', 'bg-success-400'];
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength ? colors[strength - 1] : 'bg-dark-700'}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 ${strength <= 2 ? 'text-warning-400' : 'text-success-400'}`}>
        {labels[strength - 1] || ''}
      </p>
    </div>
  );
}

function RegisterForm() {
  const { register, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
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
    setInfo('');

    try {
      const result = await register(form);
      if (result?.requiresEmailVerification) {
        setInfo(result.message || 'Veuillez vérifier votre email pour activer votre compte.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 right-1/3 w-[500px] h-[500px] bg-accent-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="card max-w-md w-full relative z-10 gradient-border"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-lg blur-lg group-hover:bg-primary-500/30 transition-all" />
              <Zap className="relative w-8 h-8 text-primary-400" />
            </div>
            <span className="text-2xl font-extrabold gradient-text">XEARN</span>
          </Link>
          <h1 className="heading-md">Créer un compte</h1>
          <p className="text-dark-400 mt-2 text-sm">Rejoignez la communauté XEARN</p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-danger-500/10 border border-danger-500/20 rounded-xl p-3 mb-6 text-danger-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Info */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-success-500/10 border border-success-500/20 rounded-xl p-3 mb-6 text-success-400 text-sm text-center"
          >
            {info}
          </motion.div>
        )}

        {/* Google */}
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem('googleAuthPending', 'true');
              signIn('google', { callbackUrl: '/dashboard' });
            } catch (err) {
              console.error('Erreur Google Sign-In:', err);
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-3 text-sm font-medium transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuer avec Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-dark-500 uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label htmlFor="firstName" className="input-label">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  id="firstName"
                  type="text"
                  className="input-field pl-10"
                  placeholder="Jean"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="lastName" className="input-label">Nom</label>
              <input
                id="lastName"
                type="text"
                className="input-field"
                placeholder="Dupont"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-email" className="input-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                id="reg-email"
                type="email"
                className="input-field pl-10"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="phone" className="input-label">Téléphone <span className="text-dark-500">(optionnel)</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                id="phone"
                type="tel"
                className="input-field pl-10"
                placeholder="+228 90 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-password" className="input-label">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field pl-10 pr-10"
                placeholder="Min. 6 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          <div className="input-group">
            <label htmlFor="referral" className="input-label flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-accent-400" />
              Code de parrainage <span className="text-dark-500">(optionnel)</span>
            </label>
            <input
              id="referral"
              type="text"
              className="input-field"
              placeholder="Entrez un code de parrainage"
              value={form.referralCode}
              onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
              readOnly={!!refCode}
            />
          </div>

          <p className="text-xs text-dark-500 text-center leading-relaxed">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/legal/cgu" className="text-primary-400 hover:text-primary-300 underline" target="_blank">CGU</Link>{' '}
            et notre{' '}
            <Link href="/legal/confidentialite" className="text-primary-400 hover:text-primary-300 underline" target="_blank">Politique de confidentialité</Link>.
          </p>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</> : 'Créer mon compte'}
          </button>
        </form>

        <div className="divider mt-6 mb-4" />

        <p className="text-center text-dark-400 text-sm">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
