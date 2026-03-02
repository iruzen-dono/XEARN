'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Plus,
  Loader2,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adsApi } from '@/lib/api';
import type { Advertisement } from '@/types';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: { label: 'En attente', cls: 'badge-warning', icon: Clock },
  ACTIVE: { label: 'Active', cls: 'badge-success', icon: CheckCircle2 },
  PAUSED: {
    label: 'En pause',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: PauseCircle,
  },
  EXPIRED: {
    label: 'Expirée',
    cls: 'bg-white/[0.04] text-dark-400 border-white/[0.06]',
    icon: Clock,
  },
  REJECTED: { label: 'Rejetée', cls: 'badge-danger', icon: XCircle },
};

export default function AdsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    targetUrl: '',
    expiresAt: '',
  });

  const fetchAds = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adsApi.getMine(token);
      setAds(data?.ads || []);
    } catch (err) {
      console.error('Erreur chargement pubs:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.title.trim()) return;
    setCreating(true);
    try {
      await adsApi.create(token, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        mediaUrl: form.mediaUrl.trim() || undefined,
        targetUrl: form.targetUrl.trim() || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('Publicité créée ! Elle sera examinée par un administrateur.');
      setForm({ title: '', description: '', mediaUrl: '', targetUrl: '', expiresAt: '' });
      setShowCreate(false);
      await fetchAds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur création';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Supprimer cette publicité ?')) return;
    setDeleting(id);
    try {
      await adsApi.remove(token, id);
      toast.success('Publicité supprimée');
      await fetchAds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur suppression';
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <MotionDiv preset="fadeUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-lg flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                <Megaphone className="w-6 h-6 text-primary-400" />
              </div>
              Mes Publicités
            </h1>
            <p className="text-dark-400 text-sm mt-1">Créez et gérez vos campagnes publicitaires</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nouvelle pub
          </motion.button>
        </div>
      </MotionDiv>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="card-hover">
              <h2 className="text-lg font-semibold mb-4">Créer une publicité</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm text-dark-300 mb-1.5 block font-medium">Titre *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Titre de la publicité"
                    minLength={3}
                    maxLength={120}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-300 mb-1.5 block font-medium">
                    Description
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Description optionnelle"
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-dark-300 mb-1.5 block font-medium">
                      URL média (image/vidéo)
                    </label>
                    <input
                      type="url"
                      className="input-field"
                      placeholder="https://..."
                      value={form.mediaUrl}
                      onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-dark-300 mb-1.5 block font-medium">
                      URL cible (lien cliquable)
                    </label>
                    <input
                      type="url"
                      className="input-field"
                      placeholder="https://..."
                      value={form.targetUrl}
                      onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-300 mb-1.5 block font-medium">
                    Date d&apos;expiration
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={creating}
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Création...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Créer
                      </>
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ads list */}
      {ads.length === 0 ? (
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold mb-1">Aucune publicité</h3>
              <p className="text-dark-400 text-sm max-w-xs">
                Créez votre première publicité pour la diffuser auprès de nos utilisateurs.
              </p>
            </div>
          </div>
        </MotionDiv>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {ads.map((ad) => {
            const cfg = STATUS_CONFIG[ad.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;
            return (
              <motion.div key={ad.id} variants={staggerItem}>
                <div className="card-hover flex flex-col md:flex-row md:items-center gap-4">
                  {ad.mediaUrl && (
                    <Image
                      src={ad.mediaUrl}
                      alt={ad.title}
                      width={96}
                      height={80}
                      className="w-full md:w-24 h-20 object-cover rounded-xl bg-white/[0.02]"
                      unoptimized
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate text-white">{ad.title}</h3>
                      <span className={`badge ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    {ad.description && (
                      <p className="text-dark-400 text-sm line-clamp-2">{ad.description}</p>
                    )}
                    <div className="text-dark-500 text-xs mt-1">
                      Créée le{' '}
                      {new Date(ad.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {ad.expiresAt && (
                        <>
                          {' '}
                          · Expire le{' '}
                          {new Date(ad.expiresAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ad.targetUrl && (
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl text-dark-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="Voir le lien"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(ad.id)}
                      disabled={deleting === ad.id}
                      className="p-2.5 rounded-xl text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deleting === ad.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
