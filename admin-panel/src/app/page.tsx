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
    { title: 'Gross Volume', value: `Rs. ${metrics.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: '+14.2%', up: true, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { title: 'Orders Flux',  value: metrics.totalOrders.toLocaleString(), icon: ShoppingBag, trend: '+8.2%', up: true,  color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { title: 'Fleet Active', value: metrics.activeRiders.toLocaleString(), icon: Bike,  trend: '-2.1%',  up: false, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { title: 'Moderation', value: metrics.pendingChangeRequests.toLocaleString(), icon: RefreshCw, trend: 'Action Req', up: false, color: 'from-rose-500 to-red-600', shadow: 'shadow-rose-500/20' },
  ];

  return (
    <div className="page-container space-y-10 pb-20">
      {/* Premium Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Platform overview and real-time performance analytics.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Last Updated</span>
             <span className="text-sm font-semibold text-slate-900 mt-1">{lastUpdated?.toLocaleTimeString()}</span>
           </div>
           <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="btn-ghost btn-icon"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Group */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card hover:bg-slate-50 transition-all border-slate-200/60">
            <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-xl bg-slate-900 text-white shadow-sm`}>
                  <s.icon size={20} />
               </div>
               <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${s.up ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50 text-rose-600 border border-rose-100/50'}`}>
                  {s.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {s.trend}
               </div>
            </div>
            <div>
              <p className="stat-label uppercase tracking-widest text-[10px] mb-1">{s.title}</p>
              <p className="stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Performance Chart */}
        <div className="data-table-container lg:col-span-2 flex flex-col">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Revenue Performance</h2>
              <p className="text-xs text-slate-500 font-medium">Daily transaction pulse across all systems</p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200/60">
              {RANGE_OPTS.map((o) => (
                <button
                  key={o}
                  onClick={() => setRange(o)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${range === o ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                  <YAxis yAxisId="r" orientation="right" hide />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[200px] animate-in zoom-in-95 duration-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-slate-500">Revenue</span>
                              <span className="text-xs font-bold text-blue-600">Rs. {payload[0]?.value?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-slate-500">Volume</span>
                              <span className="text-xs font-bold text-slate-900">{payload[1]?.value} units</span>
                            </div>
                          </div>
                        </div>
                      ) : null
                    }
                  />
                  <Area yAxisId="l" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fill="url(#revenueGradient)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                  <Bar yAxisId="r" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} opacity={0.05} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Hub / Pending Requests */}
        <div className="data-table-container flex flex-col h-[544px]">
          <div className="px-6 py-6 border-b border-slate-100 bg-white">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Action Queue</h2>
                  <p className="text-xs font-medium text-slate-500">Pending moderation requests</p>
                </div>
                {metrics.pendingChangeRequests > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                    {metrics.pendingChangeRequests} Action Required
                  </span>
                )}
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
            {pendingCRs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <RefreshCw size={32} className="text-slate-300 mb-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue Synchronized</p>
              </div>
            ) : pendingCRs.map((cr) => (
              <div 
                key={cr.id} 
                className="p-4 bg-white rounded-xl border border-slate-200/60 hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer group" 
                onClick={() => router.push(`/change-requests/${cr.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-slate-900 text-xs truncate mb-0.5">{cr.entityType}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{cr.tenantName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-[9px] font-bold text-slate-600 uppercase">{cr.actionType}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-white border-t border-slate-100">
            <button
               onClick={() => router.push('/change-requests')}
               className="btn-ghost w-full py-2.5 rounded-xl border-slate-200 text-xs font-bold flex items-center justify-center gap-2"
            >
              View All Requests <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Global Transaction Stream */}
        <div className="data-table-container lg:col-span-3">
          <div className="px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Transactions</h2>
              <p className="text-xs font-medium text-slate-500">Live order audit and status stream</p>
            </div>
            <button
               onClick={() => router.push('/orders')}
               className="btn-ghost !px-6 !py-2 rounded-xl text-xs font-bold"
            >
              View Full History
            </button>
          </div>
          <div className="px-8 pb-10 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {recentOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs font-semibold text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-3xl">No Transaction Data</div>
              ) : recentOrders.map((o) => (
                <div key={o.id} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-200/50 hover:bg-white hover:border-blue-500/20 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                     <p className="font-bold text-slate-900 text-sm truncate w-2/3">{o.customerName}</p>
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm">
                        <ShoppingBag size={15} />
                     </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-slate-900 leading-tight">Rs. {Math.round(o.totalAmount || 0)}</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-1">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
