'use client';

import React, { useState, useEffect } from 'react';
import { Bike, Search, Phone, ShieldCheck, ShieldX, Star, X, FileText, CheckCircle, AlertCircle, RefreshCw, Pencil, MapPin, Zap } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

interface Rider {
  id: string; name: string; phoneNumber: string; email: string;
  vehicleType: string; vehicleNumber: string; cnicFrontUrl: string;
  cnicBackUrl: string; selfieUrl: string; isActive: boolean; isOnline: boolean;
  isProfileComplete: boolean; isPharmaApproved: boolean; totalEarnings: number; averageRating: number;
  totalReviews: number; createdAt: string;
}

const API_URL = `${BASE_URL}/riders`;

export default function RidersPage() {
  const [riders,      setRiders]      = useState<Rider[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterStatus,setFilterStatus]= useState<'all' | 'active' | 'blocked' | 'pending' | 'pharma'>('all');
  const [viewingDocs, setViewingDocs] = useState<Rider | null>(null);
  const [updating,    setUpdating]    = useState<string | null>(null);
  const [editingRider,setEditingRider]= useState<Rider | null>(null);
  const [savingEdit,  setSavingEdit]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [limit]                       = useState(12);
  const [editData, setEditData] = useState({ name: '', phoneNumber: '', email: '', vehicleType: '', vehicleNumber: '' });

  useEffect(() => { fetchRiders(); }, []);

  const fetchRiders = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/all`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch riders'));
      setRiders(await res.json());
    } catch (err) {
      setError(getErrorMessage(err, 'Fleet sync failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rider: Rider) => {
    setUpdating(rider.id);
    try {
      const res = await fetchWithAuth(`${API_URL}/${rider.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rider.isActive }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update rider'));
      setRiders(prev => prev.map(r => r.id === rider.id ? { ...r, isActive: !rider.isActive } : r));
      showToast({ title: `Asset ${rider.isActive ? 'grounded' : 'activated'}`, variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update rider'), variant: 'error' });
    } finally {
      setUpdating(null);
    }
  };

  const handleTogglePharma = async (rider: Rider) => {
    setUpdating(rider.id);
    try {
      const res = await fetchWithAuth(`${API_URL}/${rider.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPharmaApproved: !rider.isPharmaApproved }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update rider'));
      setRiders(prev => prev.map(r => r.id === rider.id ? { ...r, isPharmaApproved: !rider.isPharmaApproved } : r));
      showToast({ title: `Pharma clearance ${rider.isPharmaApproved ? 'revoked' : 'granted'}`, variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update rider'), variant: 'error' });
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRider) return;
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${editingRider.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update rider'));
      setRiders(prev => prev.map(r => r.id === editingRider.id ? { ...r, ...editData } : r));
      showToast({ title: 'Asset profile updated', variant: 'success' });
      setEditingRider(null);
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update rider'), variant: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openEdit = (rider: Rider) => {
    setEditData({ name: rider.name, phoneNumber: rider.phoneNumber, email: rider.email || '', vehicleType: rider.vehicleType || '', vehicleNumber: rider.vehicleNumber || '' });
    setEditingRider(rider);
  };

  const filtered = riders.filter(r => {
    const matchS = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.phoneNumber?.includes(searchTerm) || r.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchF = filterStatus === 'all' || (filterStatus === 'active' && r.isActive && r.isProfileComplete) || (filterStatus === 'blocked' && !r.isActive) || (filterStatus === 'pending' && !r.isProfileComplete) || (filterStatus === 'pharma' && r.isPharmaApproved);
    return matchS && matchF;
  });

  const paginated = filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filtered.length / limit);
  
  const onlineCount = riders.filter(r => r.isOnline).length;
  const activeCount = riders.filter(r => r.isActive && r.isProfileComplete).length;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-8 pb-4">
      {/* Strategic Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2 border-b border-slate-100/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
              <Bike size={24} className="text-primary-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Fleet Command</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Logistics Asset Registry · {riders.length} Operatives Enrolled</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search operative..."
              className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          <button
            onClick={fetchRiders}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        {([
          { key: 'all', label: 'All Fleet' },
          { key: 'active', label: 'Operational' },
          { key: 'blocked', label: 'Grounded' },
          { key: 'pending', label: 'Onboarding' },
          { key: 'pharma', label: '💊 Pharma Cleared' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => { setFilterStatus(f.key); setPage(1); }}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
              filterStatus === f.key
                ? 'bg-slate-900 text-white border-slate-950 shadow-slate-200'
                : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        
        {/* Live counters */}
        <div className="ml-auto flex items-center gap-6 pl-4">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {onlineCount} Online
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activeCount} Active</span>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-20 flex flex-col items-center"><RefreshCw className="animate-spin text-primary-500 mb-6" size={48} /><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Syncing Fleet...</p></div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-rose-500 font-black text-sm mb-4">{error}</p>
            <button onClick={fetchRiders} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Retry Sync</button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-32 flex flex-col items-center opacity-40"><Bike size={64} className="text-slate-200 mb-6" /><p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">No matching operatives</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginated.map(rider => (
              <div
                key={rider.id}
                className="group relative bg-white rounded-[2.5rem] border border-slate-100/60 p-8 transition-all hover:border-primary-200 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 overflow-hidden"
              >
                {/* Online indicator */}
                <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${rider.isOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40' : 'bg-slate-200'}`} />

                {/* Identity */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0 shadow-lg ${
                    rider.isActive
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
                      : 'bg-slate-300 shadow-slate-300/20'
                  }`}>
                    {rider.name?.charAt(0)?.toUpperCase() || 'R'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-black text-slate-900 uppercase italic tracking-tight truncate">{rider.name || 'Unknown'}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">UNIT · {rider.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-sm font-black text-slate-900 tracking-tighter mt-1">Rs.{Number(rider.totalEarnings || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rating</p>
                    <p className="text-sm font-black text-amber-600 tracking-tighter mt-1 flex items-center justify-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {rider.averageRating ? Number(rider.averageRating).toFixed(1) : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle</p>
                    <p className="text-[10px] font-black text-slate-700 tracking-tight mt-1 truncate">{rider.vehicleNumber || '—'}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2 mb-6">
                  <p className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <Phone size={12} className="text-slate-300" /> {rider.phoneNumber}
                  </p>
                  {rider.email && (
                    <p className="text-[10px] font-medium text-slate-400 truncate pl-5">{rider.email}</p>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {!rider.isProfileComplete ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                      <AlertCircle size={10} /> Onboarding
                    </span>
                  ) : rider.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                      <CheckCircle size={10} /> Operational
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100">
                      <ShieldX size={10} /> Grounded
                    </span>
                  )}
                  {rider.isPharmaApproved && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100">
                      <ShieldCheck size={10} /> Pharma
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div className="flex gap-2">
                  <button onClick={() => setViewingDocs(rider)} className="flex-1 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95" title="KYC Docs">
                    <FileText size={14} className="mx-auto" />
                  </button>
                  <button onClick={() => openEdit(rider)} className="flex-1 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all active:scale-95" title="Edit">
                    <Pencil size={14} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => handleTogglePharma(rider)}
                    disabled={updating === rider.id}
                    className={`flex-1 py-3 border rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      rider.isPharmaApproved
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                    }`}
                    title={rider.isPharmaApproved ? 'Revoke Pharma' : 'Approve Pharma'}
                  >
                    <ShieldCheck size={14} className="mx-auto" />
                  </button>
                  <button
                    disabled={updating === rider.id}
                    onClick={() => handleToggleActive(rider)}
                    className={`flex-1 py-3 border rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      rider.isActive
                        ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                    }`}
                  >
                    {updating === rider.id ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : rider.isActive ? (
                      <ShieldX size={14} className="mx-auto" />
                    ) : (
                      <ShieldCheck size={14} className="mx-auto" />
                    )}
                  </button>
                </div>

                {/* Decorative bg */}
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity bg-primary-500 blur-xl" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} Fleet Assets</p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Documents Modal — Premium Glass Overlay */}
      {viewingDocs && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"  onClick={() => setViewingDocs(null)}>
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="px-10 py-8 flex items-center justify-between border-b border-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">KYC Verification</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{viewingDocs.name} · UNIT {viewingDocs.id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full flex items-center justify-center transition-all hover:rotate-90 active:scale-90">
                <X size={20} />
              </button>
            </div>
            <div className="p-10 space-y-6">
              {[['CNIC Front', viewingDocs.cnicFrontUrl], ['CNIC Back', viewingDocs.cnicBackUrl], ['Selfie', viewingDocs.selfieUrl]].map(([label, url]) => (
                <div key={label}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
                  {url ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={url} alt={label} className="w-full max-h-52 object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 h-24 flex items-center justify-center">
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Not Uploaded</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal — Premium Glass Overlay */}
      {editingRider && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setEditingRider(null)}>
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="px-10 py-8 flex items-center justify-between border-b border-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Modify Asset</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{editingRider.name}</p>
              </div>
              <button onClick={() => setEditingRider(null)} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full flex items-center justify-center transition-all hover:rotate-90 active:scale-90">
                <X size={20} />
              </button>
            </div>
            <div className="p-10 space-y-5">
              {[['Callsign', 'name', 'text'], ['Comm Channel', 'phoneNumber', 'tel'], ['Digital Address', 'email', 'email'], ['Chassis Type', 'vehicleType', 'text'], ['Unit Designation', 'vehicleNumber', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">{label}</label>
                  <input type={type} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-primary-500/5 transition-all text-slate-700" value={(editData as any)[key]} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="px-10 pb-10">
              <button onClick={handleSaveEdit} disabled={savingEdit} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center hover:bg-black transition-all shadow-2xl shadow-slate-900/20 active:scale-95">
                {savingEdit ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
