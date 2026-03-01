'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, Pause, ChevronLeft, ChevronRight, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

const AD_STATUSES = ['ALL', 'PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED'] as const;

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400',
  ACTIVE: 'bg-green-500/10 text-green-400',
  PAUSED: 'bg-yellow-500/10 text-yellow-400',
  EXPIRED: 'bg-dark-700 text-dark-400',
  REJECTED: 'bg-red-500/10 text-red-400',
};

const statusLabels: Record<string, string> = {
  ALL: 'Tous',
  PENDING: 'En attente',
  ACTIVE: 'Active',
  PAUSED: 'En pause',
  EXPIRED: 'Expirée',
  REJECTED: 'Rejetée',
};

export default function AdminAdsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [ads, setAds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const status = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await adminApi.getAllAds(token, page, status) as any;
      setAds(data.ads || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur chargement publicités:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await adminApi.approveAd(token, id);
      toast.success('Publicité approuvée');
      await fetchAds();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token || !confirm('Rejeter cette publicité ?')) return;
    setActionLoading(id);
    try {
      await adminApi.rejectAd(token, id);
      toast.success('Publicité rejetée');
      await fetchAds();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await adminApi.pauseAd(token, id);
      toast.success('Publicité mise en pause');
      await fetchAds();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Gestion des publicités</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-dark-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
          >
            {AD_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-dark-400 text-sm mb-4">
        {total} publicité{total > 1 ? 's' : ''}
        {statusFilter !== 'ALL' && ` (${statusLabels[statusFilter]})`}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : ads.length === 0 ? (
        <div className="card text-center text-dark-400 py-12">
          Aucune publicité {statusFilter !== 'ALL' ? `avec le statut "${statusLabels[statusFilter]}"` : ''}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{ad.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[ad.status] || ''}`}>
                      {statusLabels[ad.status] || ad.status}
                    </span>
                  </div>
                  <div className="text-dark-500 text-xs flex flex-wrap gap-3">
                    <span>Pub #{ad.id.slice(-6)}</span>
                    <span>Annonceur: {ad.publisherId?.slice(-6) || 'N/A'}</span>
                    <span>Créée le {new Date(ad.createdAt).toLocaleDateString('fr-FR')}</span>
                    {ad.expiresAt && (
                      <span>Expire le {new Date(ad.expiresAt).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  {ad.description && (
                    <div className="text-dark-400 text-xs mt-1 truncate">{ad.description}</div>
                  )}
                  {ad.targetUrl && (
                    <a
                      href={ad.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {ad.targetUrl.length > 60 ? ad.targetUrl.slice(0, 60) + '…' : ad.targetUrl}
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {actionLoading === ad.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-dark-400" />
                  ) : (
                    <>
                      {(ad.status === 'PENDING' || ad.status === 'PAUSED') && (
                        <button
                          onClick={() => handleApprove(ad.id)}
                          title="Approuver" aria-label="Approuver la publicité"
                          className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {ad.status === 'ACTIVE' && (
                        <button
                          onClick={() => handlePause(ad.id)}
                          title="Mettre en pause" aria-label="Mettre en pause la publicité"
                          className="p-2 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {ad.status !== 'REJECTED' && ad.status !== 'EXPIRED' && (
                        <button
                          onClick={() => handleReject(ad.id)}
                          title="Rejeter" aria-label="Rejeter la publicité"
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Page précédente"
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-400">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Page suivante"
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
