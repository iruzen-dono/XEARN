'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/lib/api';

interface OverviewData {
  totalUsers: number;
  activeUsers: number;
  activeUserPercentage: string;
  totalRevenue: string;
  totalPayouts: string;
  netProfit: string;
}

interface RevenueBreakdown {
  ads: string;
  tasks: string;
  premium: string;
  referrals: string;
  total: string;
}

interface ReferralStats {
  totalReferrals: number;
  referralsEarnings: string;
  averageEarningsPerReferral: string;
}

interface TopEarner {
  id: string;
  email: string;
  name: string;
  totalEarned: string;
}

interface DashboardData {
  overview: OverviewData;
  userGrowth: Array<{ date: string; users: number }>;
  revenueBreakdown: RevenueBreakdown;
  referralStats: ReferralStats;
  topEarners: TopEarner[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AdminAnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const [overview, userGrowth, revenueBreakdown, referralStats, topEarners] = await Promise.all(
        [
          api<OverviewData>('/admin/analytics/overview'),
          api<Array<{ date: string; users: number }>>('/admin/analytics/user-growth?days=30'),
          api<RevenueBreakdown>('/admin/analytics/revenue-breakdown'),
          api<ReferralStats>('/admin/analytics/referral-stats'),
          api<TopEarner[]>('/admin/analytics/top-earners?limit=10'),
        ],
      );

      setData({ overview, userGrowth, revenueBreakdown, referralStats, topEarners });
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60_000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) return <div className="p-4">Chargement des analytics...</div>;
  if (error) return <div className="p-4 text-red-500">Erreur : {error}</div>;
  if (!data) return null;

  const totalRevenue = Number(data.revenueBreakdown.total) || 1;
  const revenueBreakdownData = [
    { name: 'Ads', value: Number(data.revenueBreakdown.ads) },
    { name: 'Tasks', value: Number(data.revenueBreakdown.tasks) },
    { name: 'Premium', value: Number(data.revenueBreakdown.premium) },
    { name: 'Referrals', value: Number(data.revenueBreakdown.referrals) },
  ];

  const profitMargin =
    Number(data.overview.totalRevenue) > 0
      ? ((Number(data.overview.netProfit) / Number(data.overview.totalRevenue)) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Utilisateurs</h3>
          <p className="text-3xl font-bold">{data.overview.totalUsers}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.overview.activeUsers} actifs ({data.overview.activeUserPercentage}%)
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Revenus totaux</h3>
          <p className="text-3xl font-bold">{data.overview.totalRevenue} FCFA</p>
          <p className="text-xs text-gray-500 mt-1">{data.overview.totalPayouts} FCFA versés</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Profit net</h3>
          <p className="text-3xl font-bold text-green-600">{data.overview.netProfit} FCFA</p>
          <p className="text-xs text-gray-500 mt-1">{profitMargin}% marge</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Croissance (30 jours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Répartition revenus</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: ${((value / totalRevenue) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                dataKey="value"
              >
                {revenueBreakdownData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} FCFA`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Réseau de parrainage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Total parrainages</p>
            <p className="text-2xl font-bold">{data.referralStats.totalReferrals}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Gains parrainages</p>
            <p className="text-2xl font-bold">{data.referralStats.referralsEarnings} FCFA</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Moy. / parrainage</p>
            <p className="text-2xl font-bold">
              {data.referralStats.averageEarningsPerReferral} FCFA
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Top 10 Earners</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Nom</th>
                <th className="text-right py-2">Total gagné (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {data.topEarners.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{user.name}</td>
                  <td className="py-2 text-right font-semibold">{user.totalEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
