'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Shield, Save, Loader2, CheckCircle, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { usersApi } from '@/lib/api';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const toast = useToast();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync form fields when user data loads or changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);

    try {
      await usersApi.updateProfile(token, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
      });
      toast.success('Profil mis à jour !');
      refreshUser();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setSavingPassword(true);

    try {
      await usersApi.changePassword(token, passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Mot de passe modifié !');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const isGoogleUser = user?.provider === 'GOOGLE';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Mon profil</h1>
      <p className="text-dark-400 mb-8">Gérez vos informations personnelles</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Info card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-3">
                <span className="text-3xl font-bold text-primary-400">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user?.status === 'ACTIVATED' ? 'bg-green-500/10 text-green-400' :
                  user?.status === 'FREE' ? 'bg-dark-700 text-dark-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {user?.status === 'ACTIVATED' ? 'Compte activé' :
                   user?.status === 'FREE' ? 'Compte gratuit' : user?.status}
                </span>
                {user?.role === 'ADMIN' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400">Admin</span>
                )}
                {isGoogleUser && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Google</span>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-dark-400 p-2 rounded-lg bg-dark-800/50">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{user?.email || 'Non renseigné'}</span>
                {user?.emailVerifiedAt && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 ml-auto" />}
              </div>
              <div className="flex items-center gap-3 text-dark-400 p-2 rounded-lg bg-dark-800/50">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{user?.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-3 text-dark-400 p-2 rounded-lg bg-dark-800/50">
                <Star className="w-4 h-4 shrink-0" />
                <div>
                  <span className="text-xs text-dark-500">Code parrainage</span>
                  <p className="text-white font-mono text-xs">{user?.referralCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-dark-400 p-2 rounded-lg bg-dark-800/50">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Inscrit le {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
              </div>
            </div>
          </div>

          {isGoogleUser && (
            <div className="card bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-blue-300">Compte Google</p>
                  <p className="text-sm text-dark-400">
                    La gestion du mot de passe se fait via votre compte Google.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit profile form */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-400" />
              Modifier mes informations
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dark-300 mb-1 block">Prénom</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-300 mb-1 block">Nom</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-dark-300 mb-1 block">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="tel"
                    className="input-field pl-10"
                    placeholder="+22890123456"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </div>

          {/* Change password (only for LOCAL users) */}
          {!isGoogleUser && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary-400" />
                Changer le mot de passe
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-dark-300 mb-1 block">Mot de passe actuel</label>
                    <input
                      type="password"
                      className="input-field"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div></div>
                  <div>
                    <label className="text-sm text-dark-300 mb-1 block">Nouveau mot de passe</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="6 caractères minimum"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-dark-300 mb-1 block">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      className="input-field"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-red-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={savingPassword || passwordForm.newPassword !== passwordForm.confirmPassword} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
