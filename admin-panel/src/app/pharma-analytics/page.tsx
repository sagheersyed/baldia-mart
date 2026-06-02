'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, TrendingUp, FileText, Package, AlertTriangle, 
  RefreshCw, CalendarDays, ShoppingBag, CheckCircle, XCircle, Clock,
  Timer, ArrowRightCircle, BarChart3, Pill
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';

const API_URL = `${BASE_URL}/analytics/pharma`;

const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];
const QUOTATION_COLORS = { accepted: '#10b981', rejected: '#f43f5e', expired: '#94a3b8', pending: '#f59e0b' };

export default function PharmaAnalytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('weekly');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth(`${API_URL}?range=${range}`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch pharma analytics'));
      const data = await res.json();
      setMetrics(data);
    } catch (e: any) {
      setError(e.message || 'Unable to load pharma analytics.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !metrics) return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-500">Generating Pharma Intelligence…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-4 text-center">
      <p className="font-semibold text-slate-700">{error}</p>
      <button onClick={fetchData} className="btn-primary">Retry</button>
    </div>
  );

  const rxData = [
    { name: 'Approved', value: metrics.prescriptions.approved },
    { name: 'Rejected', value: metrics.prescriptions.rejected },
    { name: 'Pending', value: metrics.prescriptions.pending },
  ];

  const quotationFunnel = [
    { name: 'Accepted', value: metrics.quotationStats?.accepted || 0, color: QUOTATION_COLORS.accepted },
    { name: 'Rejected', value: metrics.quotationStats?.rejected || 0, color: QUOTATION_COLORS.rejected },
    { name: 'Expired', value: metrics.quotationStats?.expired || 0, color: QUOTATION_COLORS.expired },
    { name: 'Pending', value: metrics.quotationStats?.pending || 0, color: QUOTATION_COLORS.pending },
  ];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2 text-emerald-700">
            <Activity size={22} />
            Pharma Intelligence Dashboard
          </h1>
          <p className="page-subtitle">Real-time health of your pharmaceutical marketplace</p>
        </div>
        <div className="flex items-center gap-2">
          {['weekly', 'monthly', 'yearly'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${range === r ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <button onClick={fetchData} className="btn-ghost ml-2">
            <RefreshCw size={15} />
          </button>
          <button 
            onClick={async () => {
              try {
                const res = await fetchWithAuth(`${BASE_URL}/analytics/pharma/regulatory`);
                if (!res.ok) throw new Error('Unauthorized');
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              } catch (e) {
                alert('Failed to generate report. Please check your permissions.');
              }
            }}
            className="btn-outline ml-2 flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <FileText size={15} />
            Regulatory Report
          </button>
        </div>
      </div>

      {/* Primary Stats — 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard 
          title="Pharma Revenue" 
          value={`Rs. ${metrics.revenue.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <StatCard 
          title="Rx Approval Rate" 
          value={`${metrics.prescriptions.conversionRate.toFixed(1)}%`} 
          icon={FileText} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Prescriptions" 
          value={metrics.prescriptions.total} 
          icon={ShoppingBag} 
          color="bg-violet-50 text-violet-600" 
        />
        <StatCard 
          title="Avg Delivery Time" 
          value={`${metrics.avgDeliveryMinutes || 0} min`} 
          icon={Timer} 
          color="bg-cyan-50 text-cyan-600" 
        />
        <StatCard 
          title="Near Expiry" 
          value={metrics.nearExpiryCount} 
          icon={AlertTriangle}
          color="bg-amber-50 text-amber-600" 
          isWarning={metrics.nearExpiryCount > 0}
        />
      </div>

      {/* Daily Trend Chart */}
      {metrics.dailyTrend?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-600" />
            Daily Pharma Orders &amp; Revenue (14 Days)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? `Rs. ${Number(value).toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" barSize={20} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prescription conversion */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Prescription Status
          </h2>
          <div className="h-64 flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rxData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rxData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <RxStatusItem label="Approved" count={metrics.prescriptions.approved} icon={CheckCircle} color="text-emerald-600" />
              <RxStatusItem label="Rejected" count={metrics.prescriptions.rejected} icon={XCircle} color="text-rose-600" />
              <RxStatusItem label="Pending Review" count={metrics.prescriptions.pending} icon={Clock} color="text-amber-600" />
            </div>
          </div>
        </div>

        {/* Quotation Pipeline */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowRightCircle size={18} className="text-violet-600" />
            Quotation Pipeline
          </h2>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-slate-900">{metrics.quotationStats?.total || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Quotations</p>
            </div>
            
            {/* Visual funnel bars */}
            {quotationFunnel.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">{item.name}</span>
                  <span className="text-xs font-bold text-slate-800">{item.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(metrics.quotationStats?.total || 0) > 0 ? (item.value / metrics.quotationStats.total) * 100 : 0}%`,
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Conversion Rate</span>
              <span className="text-lg font-bold text-emerald-600">{(metrics.quotationStats?.conversionRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Top Medicines */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Pill size={18} className="text-emerald-600" />
            Best Selling Medicines
          </h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {metrics.topMedicines.map((med: any, i: number) => (
              <div key={med.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white text-[10px] font-bold flex items-center justify-center text-slate-400 border">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{med.genericName || 'Branded'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{med.soldCount} Sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rider Incentives & SLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard 
          title="Rider Incentives Paid" 
          value={`Rs. ${metrics.riderIncentives.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-indigo-50 text-indigo-600" 
        />
        <StatCard 
          title="SLA Target" 
          value={metrics.avgDeliveryMinutes <= 40 ? '✅ Within SLA' : '⚠️ Exceeding SLA'} 
          icon={Clock} 
          color={metrics.avgDeliveryMinutes <= 40 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} 
          isWarning={metrics.avgDeliveryMinutes > 40}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, isWarning }: any) {
  return (
    <div className={`card p-5 ${isWarning ? 'border-amber-200 bg-amber-50/30' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        {isWarning && <span className="badge-yellow text-[10px]">Action Required</span>}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function RxStatusItem({ label, count, icon: Icon, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-800">{count}</span>
    </div>
  );
}

