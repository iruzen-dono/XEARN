'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Shield, Save, Loader2, CheckCircle, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { usersApi } from '@/lib/api';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <h1 className="heading-lg">Mon profil</h1>
        <p className="text-dark-400 mt-1">Gérez vos informations personnelles</p>
      </MotionDiv>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Info card */}
        <div className="lg:col-span-1">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={staggerItem}>
              <div className="card-hover">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-500/20 flex items-center justify-center mb-3 shadow-glow">
                    <span className="text-3xl font-bold gradient-text">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{user?.firstName} {user?.lastName}</h2>
                  <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                    <span className={`badge ${
                      user?.status === 'ACTIVATED' ? 'badge-success' :
                      user?.status === 'FREE' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {user?.status === 'ACTIVATED' ? 'Compte activé' :
                       user?.status === 'FREE' ? 'Compte gratuit' : user?.status}
                    </span>
                    {user?.role === 'ADMIN' && <span className="badge bg-accent-500/10 text-accent-400 border-accent-500/20">Admin</span>}
                    {isGoogleUser && <span className="badge bg-blue-500/10 text-blue-400 border-blue-500/20">Google</span>}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    { icon: Mail, value: user?.email || 'Non renseigné', extra: user?.emailVerifiedAt ? <CheckCircle className="w-3.5 h-3.5 text-success-400 shrink-0 ml-auto" /> : null },
                    { icon: Phone, value: user?.phone || 'Non renseigné' },
                    { icon: Star, value: <><span className="text-xs text-dark-500 block">Code parrainage</span><span className="text-white font-mono text-xs">{user?.referralCode}</span></> },
                    { icon: Calendar, value: `Inscrit le ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-dark-400 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <item.icon className="w-4 h-4 shrink-0 text-dark-500" />
                      <span className="truncate flex-1">{item.value}</span>
                      {item.extra}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {isGoogleUser && (
              <motion.div variants={staggerItem}>
                <div className="card bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <p className="font-medium text-blue-300">Compte Google</p>
                      <p className="text-sm text-dark-400">La gestion du mot de passe se fait via votre compte Google.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right column — Forms */}
        <div className="lg:col-span-2 space-y-6">
          <MotionDiv preset="fadeUp" delay={0.15}>
            <div className="card-hover">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                  <User className="w-5 h-5 text-primary-400" />
                </div>
                Modifier mes informations
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-dark-300 mb-1.5 block font-medium">Prénom</label>
                    <input type="text" className="input-field" value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm text-dark-300 mb-1.5 block font-medium">Nom</label>
                    <input type="text" className="input-field" value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-300 mb-1.5 block font-medium">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input type="tel" className="input-field pl-10" placeholder="+22890123456"
                      value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={savingProfile}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                </motion.button>
              </form>
            </div>
          </MotionDiv>

          {!isGoogleUser && (
            <MotionDiv preset="fadeUp" delay={0.25}>
              <div className="card-hover">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                    <Lock className="w-5 h-5 text-primary-400" />
                  </div>
                  Changer le mot de passe
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-dark-300 mb-1.5 block font-medium">Mot de passe actuel</label>
                      <input type="password" className="input-field" value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                    </div>
                    <div></div>
                    <div>
                      <label className="text-sm text-dark-300 mb-1.5 block font-medium">Nouveau mot de passe</label>
                      <input type="password" className="input-field" placeholder="6 caractères minimum"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} />
                    </div>
                    <div>
                      <label className="text-sm text-dark-300 mb-1.5 block font-medium">Confirmer</label>
                      <input type="password" className="input-field" value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required minLength={6} />
                      {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-danger-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit"
                    disabled={savingPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                  </motion.button>
                </form>
              </div>
            </MotionDiv>
          )}
        </div>
      </div>
    </div>
  );
}
