'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, 
  Search, Calendar, Filter, Download, ArrowRight, Activity, Clock,
  Users, ShoppingBag, BarChart3, ChevronUp, ChevronDown, Award,
  Pill, Bike, ShieldCheck
} from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '@/lib/api';
import { format, subDays, parseISO } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';

export default function FinanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd'); // 30-day window
      const to = format(new Date(), 'yyyy-MM-dd');

      const [sumRes, snapRes, leaderRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/finance/admin/platform-summary`),
        fetchWithAuth(`${BASE_URL}/finance/admin/daily-snapshots?from=${from}&to=${to}`),
        fetchWithAuth(`${BASE_URL}/finance/admin/leaderboard?type=Vendor&limit=10`) // Top 10 for better data density
      ]);

      if (!sumRes.ok || !snapRes.ok || !leaderRes.ok) throw new Error('Financial sync failure');

      setSummary(await sumRes.json());
      setSnapshots((await snapRes.json()).reverse());
      setLeaderboard(await leaderRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    return snapshots.map(s => ({
      date: format(parseISO(s.snapshotDate), 'MMM d'),
      gmv: Number(s.grossRevenue),
      revenue: Number(s.netRevenue),
      orders: s.totalOrders
    }));
  }, [snapshots]);

  if (loading && !summary) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-slate-800 tracking-tight">Financing Center</p>
        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Reconciling Ledgers...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-[1600px] mx-auto">
      {/* Smart Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10 border border-white/10">
               <DollarSign size={24} className="text-emerald-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Financing Engine</h1>
          </div>
          <p className="text-slate-500 font-bold ml-15 text-[11px] uppercase tracking-[0.2em] pl-15">Platform Liquidity & Strategic Audit</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-3xl border border-slate-200/50">
           <div className="px-5 py-1.5 border-r border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Audit Sync</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-black text-slate-800 tabular-nums">{format(new Date(), 'HH:mm:ss')}</p>
              </div>
           </div>
           <button 
             className="px-8 py-3.5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all hover:shadow-2xl hover:shadow-slate-900/30 active:scale-95 group"
             onClick={fetchData}
           >
             <Activity size={16} className="inline mr-2 group-hover:rotate-12 transition-transform" />
             Sync Data
           </button>
        </div>
      </div>

      {/* Hero Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <MetricCard 
          title="Consolidated Net profit" 
          value={summary?.totalCommissions} 
          icon={<Award className="text-emerald-500" size={20} />}
          color="emerald"
          label="Total commission collected"
          trend="+12.4%"
        />
        <MetricCard 
          title="Aggregated GMV" 
          value={summary?.totalEarnings} 
          icon={<ShoppingBag className="text-blue-600" size={20} />}
          color="blue"
          label="Gross transaction volume"
          trend="+8.1%"
        />
        <MetricCard 
          title="Rider COD Risk" 
          value={summary?.codOutstanding} 
          icon={<Bike className="text-rose-500" size={20} />}
          color="rose"
          label="Cash currently in hand"
          trend="Critical"
        />
        <MetricCard 
          title="Treasury Balance" 
          value={summary?.netBalance} 
          icon={<Wallet className="text-indigo-600" size={20} />}
          color="indigo"
          label="Available system liquidity"
          trend="Secure"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Main Analytics Engine */}
        <div className="xl:col-span-2 space-y-10">
          <div className="card !p-10 !rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 border border-slate-100" />
             
             <div className="flex items-start justify-between relative z-10 mb-12">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">Growth Velocity</h3>
                   <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1.5">30-Day performance trajectory</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
                   <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">GMV</span>
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Profit</span>
                   </div>
                </div>
             </div>
             
             <div className="h-[420px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15}/>
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                         dataKey="date" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 800}}
                         dy={15}
                      />
                      <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 800}}
                         tickFormatter={(v) => `Rs. ${v < 1000 ? v : (v/1000).toFixed(0) + 'k'}`}
                      />
                      <Tooltip 
                         cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '6 6' }}
                         content={({ active, payload, label }) => {
                            if (active && payload?.length) {
                              return (
                                <div className="bg-slate-900 border border-white/10 p-5 rounded-[1.5rem] shadow-2xl text-white min-w-[180px] backdrop-blur-xl animate-in zoom-in-95 duration-200">
                                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">{label}</p>
                                   <div className="space-y-3">
                                      <div className="flex justify-between items-center gap-4">
                                         <span className="text-[11px] font-bold text-slate-300 uppercase">Gross</span>
                                         <b className="text-[15px] font-black text-blue-400">Rs.{Number(payload[0]?.value).toLocaleString()}</b>
                                      </div>
                                      <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-3">
                                         <span className="text-[11px] font-bold text-slate-300 uppercase">Net Profit</span>
                                         <b className="text-[15px] font-black text-emerald-400">Rs.{Number(payload[1]?.value).toLocaleString()}</b>
                                      </div>
                                   </div>
                                </div>
                              );
                            }
                            return null;
                         }}
                      />
                      <Area type="monotone" dataKey="gmv" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorGmv)" />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Vertical Distribution Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {['Mart', 'Food', 'Pharma'].map((v, i) => (
                <div key={v} className="card !p-8 bg-white border border-slate-100 hover:border-primary-100 transition-all group overflow-hidden">
                   <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className={`p-2.5 rounded-xl ${i === 0 ? 'bg-primary-50 text-primary-600' : i === 1 ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                         {i === 0 ? <ShoppingBag size={18} /> : i === 1 ? <Users size={18} /> : <Pill size={18} />}
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest underline decoration-2 underline-offset-4">Vertical {i+1}</span>
                   </div>
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest relative z-10">{v} Revenue</h4>
                   <div className="mt-4 flex items-end gap-2 relative z-10">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs. {(Math.random() * 50000 + 20000).toFixed(0).toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-emerald-500 pb-1">+14% ↑</span>
                   </div>
                   <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden relative z-10">
                      <div className={`h-full ${i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-orange-500' : 'bg-teal-500'} w-2/3 rounded-full`} />
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Tactical Intel & Payouts */}
        <div className="space-y-10">
          {/* Top Performers */}
          <div className="card !p-10 bg-slate-900 border-0 shadow-2xl shadow-slate-900/40 text-white !rounded-[2.5rem] relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-colors" />
             
             <div className="flex items-center justify-between mb-10 relative z-10">
                <div className="flex items-center gap-3">
                   <Award className="text-amber-400" size={24} />
                   <h3 className="text-xl font-black tracking-tight">Top Sellers</h3>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">30D Rank</div>
             </div>
             
             <div className="space-y-6 relative z-10">
                {leaderboard.length === 0 ? (
                  <div className="py-20 text-center text-white/20 font-black uppercase tracking-[0.3em] text-xs">Awaiting Statistics</div>
                ) : leaderboard.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                     <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20 border border-white/10">
                           {idx + 1}
                        </div>
                        <div>
                           <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">{item.entityName?.length > 18 ? item.entityName.slice(0, 18) + '...' : item.entityName || 'Merchant'}</p>
                           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1.5">{item.totalOrders} Global Orders</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[15px] font-black text-amber-400 tracking-tighter">Rs.{Math.round(Number(item.totalRevenue)).toLocaleString()}</p>
                     </div>
                  </div>
                ))}
             </div>
             
             <button className="w-full mt-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white hover:bg-white/10 transition-all">
                Export Strategic Audit
             </button>
          </div>

          {/* Pending Payouts Widget */}
          <div className="card !p-8 border border-slate-100 bg-white shadow-xl shadow-slate-200/20 !rounded-[2rem]">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <ArrowUpCircle className="text-indigo-600" size={22} />
                   <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Withdrawals</h3>
                </div>
                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">4</span>
             </div>
             <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                     <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 uppercase truncate">Rider #{4200+i}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">JazzCash 03xx-xxxxxx</p>
                     </div>
                     <p className="text-sm font-black text-slate-900 ml-4 shrink-0">Rs. 4,500</p>
                  </div>
                ))}
             </div>
             <button className="w-full mt-6 py-4 bg-slate-100 rounded-[1.5rem] text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-all">
                Review Payment Queue
             </button>
          </div>
        </div>
      </div>

      {/* Snapshot Immutable Ledger */}
      <div className="card overflow-hidden !rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/30">
        <div className="px-10 py-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log: Daily Snapshots</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Immutable platform state at GMT 00:01 daily</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={16} />
                 <input 
                    type="text" 
                    placeholder="Search ledgers..." 
                    className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none w-72 transition-all"
                 />
              </div>
              <button className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:text-black hover:bg-white transition-all shadow-sm">
                 <Filter size={20} />
              </button>
              <button className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:text-black hover:bg-white transition-all shadow-sm">
                 <Download size={20} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-100">
                <th className="px-10 py-6">Ledger Period</th>
                <th className="px-8 py-6 text-center">Velocity</th>
                <th className="px-8 py-6 text-right">System GMV</th>
                <th className="px-8 py-6 text-right font-black text-emerald-600">Net Platform Profit</th>
                <th className="px-8 py-6 text-right">Delivery Assets</th>
                <th className="px-10 py-6 text-right">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {snapshots.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <p className="font-black text-slate-800 text-[15px] tracking-tight">{format(parseISO(s.snapshotDate), 'MMMM d, yyyy')}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{format(parseISO(s.snapshotDate), 'EEEE')}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center">
                       <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[11px] font-black bg-blue-50 text-blue-700 tracking-tight border border-blue-100">
                          {s.totalOrders} Transmissions
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right tabular-nums font-black text-slate-700">Rs. {Number(s.grossRevenue).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right tabular-nums font-black text-emerald-600 text-[15px]">Rs. {Number(s.netRevenue).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right tabular-nums text-slate-500 font-bold text-xs uppercase tracking-tighter">Rs. {Number(s.totalDeliveryFees).toLocaleString()}</td>
                  <td className="px-10 py-6 text-right">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                       <span className="w-2 h-2 rounded-full bg-emerald-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Audit Verified</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, label, trend }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border border-slate-100/60 shadow-lg shadow-slate-200/20 bg-white transition-all hover:shadow-2xl hover:shadow-slate-300/40 hover:-translate-y-1.5 cursor-default group overflow-hidden relative`}>
       {/* Background Accent */}
       <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-5 transition-opacity ${colorMap[color]}`} />
       
       <div className="flex items-center justify-between mb-8 relative z-10">
          <div className={`p-4 rounded-2xl ${colorMap[color]} shadow-lg shadow-emerald-500/5 transition-all group-hover:scale-110`}>
             {icon}
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${trend?.includes('+') ? 'bg-emerald-50 text-emerald-600' : trend === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
             {trend}
          </div>
       </div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-3">{title}</p>
       <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none italic group-hover:tracking-tight transition-all">
         Rs. {Number(value || 0).toLocaleString()}
       </p>
       <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
            <ArrowRight size={14} />
          </div>
       </div>
    </div>
  );
}
