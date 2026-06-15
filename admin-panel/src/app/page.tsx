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
    <div className="page-container space-y-12 pb-20">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
               <Activity size={24} className="text-primary-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Control Protocol</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Real-time Neural Engine · Global Sync</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Data Burst</p>
             <p className="text-sm font-black text-slate-900 mt-1">{lastUpdated?.toLocaleTimeString()}</p>
           </div>
           <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary-600 hover:shadow-xl transition-all active:scale-90"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
        {statCards.map((s, i) => (
          <div key={i} className="relative group perspective-1000">
            <div className="h-44 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-primary-500/20 group-hover:border-primary-500/10">
              <div className="flex justify-between items-start">
                 <div className={`p-4 rounded-3xl bg-gradient-to-br ${s.color} text-white shadow-lg ${s.shadow} shrink-0 group-hover:scale-110 transition-transform`}>
                    <s.icon size={20} />
                 </div>
                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight ${s.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {s.trend}
                 </div>
              </div>
              <div className="mt-6 flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.title}</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{s.value}</span>
              </div>
              <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${s.color} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Analytics Engine */}
        <div className="card !p-0 !rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/30 lg:col-span-2">
          <div className="bg-slate-950 p-8 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-black text-white tracking-widest uppercase italic">Revenue Velocity</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Global Transactional Flow</p>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl backdrop-blur-xl">
              {RANGE_OPTS.map((o) => (
                <button
                  key={o}
                  onClick={() => setRange(o)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${range === o ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 pb-10 bg-white">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} dy={15} />
                  <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                  <YAxis yAxisId="r" orientation="right" hide />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 min-w-[200px] animate-in zoom-in-95 duration-200 ring-4 ring-black/5">
                          <p className="font-black text-white/40 mb-4 text-[10px] uppercase tracking-[0.3em]">{label}</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                              <b className="text-sm font-black text-indigo-400 tracking-tighter">RS. {payload[0]?.value?.toLocaleString()}</b>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load</span>
                              <b className="text-sm font-black text-white tracking-tighter">{payload[1]?.value} OPS</b>
                            </div>
                          </div>
                        </div>
                      ) : null
                    }
                  />
                  <Area yAxisId="l" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fill="url(#gr)" dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  <Bar   yAxisId="r" dataKey="orders" fill="#000" radius={[4, 4, 0, 0]} barSize={12} opacity={0.1} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* CMS Live Queue */}
        <div className="card !p-0 !rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/30 flex flex-col h-[600px]">
          <div className="p-8 bg-slate-50 border-b border-slate-100 shrink-0">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase italic underline decoration-primary-500/20 underline-offset-8">Live Queue</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Moderation Protocol</p>
                </div>
                {metrics.pendingChangeRequests > 0 && (
                  <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-rose-500/20 animate-bounce">
                    {metrics.pendingChangeRequests}
                  </div>
                )}
             </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar bg-slate-50/30">
            {pendingCRs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40 grayscale">
                <RefreshCw size={40} className="text-slate-300 animate-spin-slow mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Quiescent</p>
              </div>
            ) : pendingCRs.map((cr) => (
              <div key={cr.id} className="p-6 bg-white rounded-3xl border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/40 hover:border-primary-500/20 transition-all cursor-pointer group" onClick={() => router.push(`/change-requests/${cr.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 text-xs uppercase tracking-widest truncate">{cr.entityType}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1 truncate">{cr.tenantName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-[9px] text-white font-black uppercase tracking-widest">{cr.actionType}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-8 shrink-0 bg-white border-t border-slate-100">
            <button
               onClick={() => router.push('/change-requests')}
               className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl shadow-slate-900/20 active:scale-95"
            >
              Access Global Stack <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Snapshot Feed */}
        <div className="card !p-0 !rounded-[4rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/30 lg:col-span-3">
          <div className="px-10 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-1.5 h-10 bg-slate-900 rounded-full" />
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Purchase Protocol</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-1">Latest Transmissions</p>
               </div>
            </div>
            <button
               onClick={() => router.push('/orders')}
               className="px-8 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
            >
              Audit Global Stream
            </button>
          </div>
          <div className="px-10 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {recentOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[3rem]">Void Stream</div>
              ) : recentOrders.map((o) => (
                <div key={o.id} className="relative group p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
                  <div className="flex justify-between items-start mb-6">
                     <p className="font-black text-slate-900 text-sm truncate tracking-tighter w-2/3">{o.customerName}</p>
                     <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[10px] text-white">
                        <ShoppingBag size={14} />
                     </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">RS. {Math.round(o.totalAmount || 0)}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Processed at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-50">
                       <StatusBadge status={o.status} />
                    </div>
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
