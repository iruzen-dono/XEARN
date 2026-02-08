'use client';

import { Play, CheckCircle } from 'lucide-react';

export default function TasksPage() {
  // Tâches de demo (mock)
  const tasks = [
    { id: '1', title: 'Regarder une publicité MTN', type: 'VIDEO_AD', reward: 50, status: 'ACTIVE' },
    { id: '2', title: 'Sondage - Habitudes digitales', type: 'SURVEY', reward: 100, status: 'ACTIVE' },
    { id: '3', title: 'Publicité Flooz Togo', type: 'VIDEO_AD', reward: 75, status: 'ACTIVE' },
    { id: '4', title: 'Cliquer sur offre T-Money', type: 'CLICK_AD', reward: 30, status: 'ACTIVE' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Tâches disponibles</h1>
      <p className="text-dark-400 mb-8">Complétez des tâches pour gagner de l&apos;argent</p>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="card flex items-center justify-between hover:border-primary-500/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold">{task.title}</h3>
                <span className="text-dark-400 text-sm">{task.type.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-accent-400 font-bold">{task.reward} FCFA</span>
              <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Compléter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
