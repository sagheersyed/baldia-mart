'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Users, ShoppingBag, Bike, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, ExternalLink, RefreshCw, CalendarDays, ChevronRight,
} from 'lucide-react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { clearAdminSession, fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  activeRiders: number;
  pendingChangeRequests: number;
}
interface ChartData { date: string; revenue: number; orders: number }
interface RecentOrder { id: string; customerName: string; totalAmount: number; status: string; createdAt: string }
interface PendingCR { id: string; tenantName: string; entityType: string; actionType: string; createdAt: string }

const API_URL = `${BASE_URL}/analytics/dashboard`;
const RANGE_OPTS = ['weekly', 'monthly', 'yearly', 'custom'] as const;
type Range = (typeof RANGE_OPTS)[number];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'badge-yellow', ACCEPTED: 'badge-blue', DELIVERING: 'badge-purple',
    OUT_FOR_DELIVERY: 'badge-purple', DELIVERED: 'badge-green', CANCELLED: 'badge-red',
  };
  return <span className={map[status.toUpperCase()] ?? 'badge-gray'}>{status}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const [metrics,      setMetrics]      = useState<DashboardMetrics | null>(null);
  const [chartData,    setChartData]    = useState<ChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [pendingCRs,   setPendingCRs]   = useState<PendingCR[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [needsReauth,  setNeedsReauth]  = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [range,        setRange]        = useState<Range>('weekly');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setNeedsReauth(false);
      const params = new URLSearchParams({ range });
      if (range === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      const [dashRes, crRes] = await Promise.all([
        fetchWithAuth(`${API_URL}?${params}`),
        fetchWithAuth(`${BASE_URL}/cms/change-requests/admin/queue?status=pending&limit=10`)
      ]);

      if (!dashRes.ok) throw new Error(await parseApiError(dashRes, 'Failed to fetch analytics'));
      const data = await dashRes.json();
      setMetrics({
        ...data.metrics,
        pendingChangeRequests: data.metrics.pendingChangeRequests || 0
      });
      setChartData(Array.isArray(data.salesChartData) ? data.salesChartData : []);
      setRecentOrders(Array.isArray(data.recentOrders) ? data.recentOrders : []);
      if (crRes.ok) {
        const crData = await crRes.json();
        setPendingCRs(crData.data ? crData.data : (Array.isArray(crData) ? crData : []));
      }
      
      setLastUpdated(new Date());
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      const forbidden = msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('admin privileges');
      setNeedsReauth(forbidden);
      setError(forbidden ? 'Session not authorized. Please login again.' : 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-500">Loading analytics…</p>
    </div>
  );

  if (!metrics) return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-4 text-center">
      <p className="font-semibold text-slate-700">{error ?? 'Dashboard unavailable.'}</p>
      <div className="flex gap-3">
        <button onClick={() => { setLoading(true); void fetchData(); }} className="btn-ghost">Retry</button>
        {needsReauth && (
          <button onClick={() => { clearAdminSession(); router.push('/login'); }} className="btn-primary">
            Login Again
          </button>
        )}
      </div>
    </div>
  );

  const statCards = [
    { title: 'Total Revenue', value: `Rs. ${metrics.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: '+12.5%', up: true, color: 'bg-emerald-50', text: 'text-emerald-600', accent: 'bg-emerald-100' },
    { title: 'Total Orders',  value: metrics.totalOrders.toLocaleString(), icon: ShoppingBag, trend: '+8.2%', up: true,  color: 'bg-blue-50', text: 'text-blue-600', accent: 'bg-blue-100' },
    { title: 'Active Riders', value: metrics.activeRiders.toLocaleString(), icon: Bike,  trend: '-2.1%',  up: false, color: 'bg-amber-50',  text: 'text-amber-600',  accent: 'bg-amber-100' },
    { title: 'Pending Review', value: metrics.pendingChangeRequests.toLocaleString(), icon: RefreshCw, trend: 'Action Req', up: false, color: 'bg-rose-50', text: 'text-rose-600', accent: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity size={22} className="text-primary-600" />
            Dashboard Overview
          </h1>
          <p className="page-subtitle">
            {lastUpdated ? `Last updated at ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void fetchData(); }}
          className="btn-ghost self-start sm:self-auto"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon size={20} className={s.text} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${s.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {s.trend}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="font-bold text-slate-800">Revenue Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales & orders over time</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {RANGE_OPTS.map((o) => (
                <button
                  key={o}
                  onClick={() => setRange(o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${range === o ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: '#3b82f6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="bg-white border border-slate-100 rounded-xl shadow-card-lg p-3 text-sm">
                        <p className="font-bold text-slate-800 mb-2">{label}</p>
                        <p className="text-emerald-700">Revenue: <b>Rs. {payload[0]?.value?.toLocaleString()}</b></p>
                        <p className="text-blue-600">Orders: <b>{payload[1]?.value}</b></p>
                      </div>
                    ) : null
                  }
                />
                <Area yAxisId="l" type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill="url(#gr)" dot={false} />
                <Bar   yAxisId="r" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} opacity={0.8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Change Requests widget */}
        <div className="card flex flex-col h-[500px]">
          <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-slate-800">Pending Reviews</h2>
              <p className="text-xs text-slate-500 mt-0.5">CMS items awaiting approval</p>
            </div>
            {metrics.pendingChangeRequests > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                {metrics.pendingChangeRequests}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
            {pendingCRs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-25 rounded-2xl border border-dashed border-slate-200 m-2">
                <RefreshCw size={32} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">All clear! No pending requests.</p>
              </div>
            ) : pendingCRs.map((cr) => (
              <div key={cr.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 group cursor-pointer" onClick={() => router.push(`/change-requests/${cr.id}`)}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-sm truncate">NEW {cr.entityType}</p>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500 font-bold uppercase">{cr.actionType}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{cr.tenantName}</p>
                </div>
                <button className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-50 shrink-0">
            <button
              onClick={() => router.push('/change-requests')}
              className="w-full btn-ghost justify-center text-sm"
            >
              Manage Requests
            </button>
          </div>
        </div>

        {/* Recent orders */}
        <div className="card flex flex-col lg:col-span-3">
          <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-slate-800">Recent Orders</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest incoming Activity</p>
            </div>
            <button
               onClick={() => router.push('/orders')}
               className="text-xs font-bold text-primary-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 p-4">
            {recentOrders.length === 0 ? (
              <div className="col-span-full py-10 text-center text-sm text-slate-400">No recent orders.</div>
            ) : recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition gap-2 border border-slate-50">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{o.customerName}</p>
                  <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">Rs. {Number(o.totalAmount || 0).toFixed(0)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
