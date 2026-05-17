'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskLandingPageData } from '@xearn/types';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

export default function TaskLandingPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const taskSlug = params.taskSlug as string;

  const [data, setData] = useState<TaskLandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10); // 10 secondes minimum
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setError('Vous devez être connecté');
        setLoading(false);
        return;
      }

      try {
        const taskData = await api<TaskLandingPageData>(`/v1/tasks/go/${taskSlug}`);
        setData(taskData);
        // L9: Use server-provided minimum duration instead of hardcoded 10s
        if (taskData.session?.minDurationSeconds) {
          setTimeLeft(taskData.session.minDurationSeconds);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskSlug, isAuthenticated]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanProceed(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleProceed = () => {
    if (data?.task.externalUrl) {
      // Ouvrir le lien externe dans un nouvel onglet
      window.open(data.task.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard/tasks');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleReturnToDashboard}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Retour aux tâches
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header avec code */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
            <div className="text-sm font-medium mb-2 opacity-90">Votre code de vérification</div>
            <div className="text-5xl font-bold tracking-wider mb-3 font-mono">
              {data.session.verificationCode}
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
              ⏱️ Mémorisez ou notez ce code
            </div>
          </div>

          {/* Contenu */}
          <div className="p-8">
            {/* Titre et récompense */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.task.title}</h1>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{data.task.reward} FCFA</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">à gagner</span>
              </div>
            </div>

            {/* Description */}
            {data.task.description && (
              <div className="mb-6">
                <p className="text-gray-700 leading-relaxed">{data.task.description}</p>
              </div>
            )}

            {/* Instructions */}
            {data.task.instructions && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">📋 Instructions</h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                  {data.task.instructions}
                </div>
              </div>
            )}

            {/* Timer */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 p-6 rounded-xl mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⏰</div>
                  <div>
                    <div className="font-semibold text-gray-900">Temps d'attente minimum</div>
                    <div className="text-sm text-gray-600">
                      Pour éviter les abus, un délai minimum est requis
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {timeLeft > 0 ? (
                    <>
                      <div className="text-3xl font-bold text-orange-600">{timeLeft}s</div>
                      <div className="text-xs text-gray-500">restantes</div>
                    </>
                  ) : (
                    <div className="text-2xl">✅</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton d'action */}
            <button
              onClick={handleProceed}
              disabled={!canProceed}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform ${
                canProceed
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canProceed ? (
                <>🚀 J'ai compris, aller sur le site</>
              ) : (
                <>⏳ Veuillez patienter {timeLeft}s...</>
              )}
            </button>

            {/* Note importante */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Important</div>
                  <p className="text-sm text-gray-700">
                    Après avoir complété la tâche sur le site externe, revenez ici et cliquez sur
                    "Terminer la tâche" dans la page des tâches. Vous devrez entrer le code{' '}
                    <span className="font-mono font-bold text-blue-600">
                      {data.session.verificationCode}
                    </span>{' '}
                    pour valider et recevoir votre récompense.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton retour */}
            <button
              onClick={handleReturnToDashboard}
              className="w-full mt-4 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
            >
              ← Retour aux tâches
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>🔒 Votre code est unique et ne peut être utilisé qu'une seule fois</p>
        </div>
      </div>
    </div>
  );
}
