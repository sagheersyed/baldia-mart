'use client';

import React, { useState, useEffect } from 'react';
import { Bike, Search, Phone, ShieldCheck, ShieldX, Star, X, FileText, CheckCircle, AlertCircle, RefreshCw, Pencil } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';

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
      setError(getErrorMessage(err, 'Failed to load riders'));
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
      showToast({ title: `Rider ${rider.isActive ? 'blocked' : 'activated'}`, variant: 'success' });
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
      showToast({ title: `Rider ${rider.isPharmaApproved ? 'removed from' : 'approved for'} pharma`, variant: 'success' });
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
      showToast({ title: 'Rider updated', variant: 'success' });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Riders</h1>
          <p className="page-subtitle">Manage delivery fleet · {riders.length} riders total</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" placeholder="Search name, phone, vehicle…" className="input pl-9 w-56" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'blocked', 'pending', 'pharma'] as const).map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s === 'pharma' ? 'Pharma Approved' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchRiders} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingState message="Loading riders…" /> :
         error   ? <ErrorState message={error} onRetry={fetchRiders} /> :
         paginated.length === 0 ? <EmptyState title="No riders found" message="Try adjusting your filters." icon={<Bike size={22} className="text-slate-300" />} /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Contact</th>
                  <th>Vehicle</th>
                  <th className="text-center">Earnings</th>
                  <th className="text-center">Rating</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(rider => (
                  <tr key={rider.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${rider.isActive ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-slate-300'}`}>
                          {rider.name?.charAt(0)?.toUpperCase() || 'R'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{rider.name || 'Unknown'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${rider.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="text-[10px] text-slate-400">{rider.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone size={11} className="text-slate-400" />{rider.phoneNumber}</p>
                      {rider.email && <p className="text-xs text-slate-400 mt-0.5">{rider.email}</p>}
                    </td>
                    <td>
                      <p className="text-sm text-slate-700 font-medium">{rider.vehicleNumber || '—'}</p>
                      <p className="text-xs text-slate-400">{rider.vehicleType || '—'}</p>
                    </td>
                    <td className="text-center font-semibold text-slate-800">Rs. {Number(rider.totalEarnings || 0).toFixed(0)}</td>
                    <td className="text-center">
                      <span className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-600">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        {rider.averageRating ? Number(rider.averageRating).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="text-center space-y-1">
                      <div>
                        {!rider.isProfileComplete ? <span className="badge-yellow"><AlertCircle size={10} /> Pending</span>
                          : rider.isActive ? <span className="badge-green"><CheckCircle size={10} /> Active</span>
                          : <span className="badge-red"><ShieldX size={10} /> Blocked</span>}
                      </div>
                      {rider.isPharmaApproved && (
                        <div><span className="badge-blue"><ShieldCheck size={10} /> Pharma</span></div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setViewingDocs(rider)} className="btn-ghost btn-icon text-slate-500" title="View Documents"><FileText size={14} /></button>
                        <button onClick={() => openEdit(rider)} className="btn-ghost btn-icon text-blue-600 border-blue-100 hover:bg-blue-50" title="Edit"><Pencil size={14} /></button>
                        <button
                          disabled={updating === rider.id}
                          onClick={() => handleTogglePharma(rider)}
                          className={`btn-icon border ${rider.isPharmaApproved ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                          title={rider.isPharmaApproved ? "Revoke Pharma Access" : "Approve for Pharma"}
                        >
                          <ShieldCheck size={14} />
                        </button>
                        <button
                          disabled={updating === rider.id}
                          onClick={() => handleToggleActive(rider)}
                          className={rider.isActive ? 'btn-danger' : 'btn-success'}
                        >
                          {updating === rider.id
                            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : rider.isActive ? <><ShieldX size={13} /> Block</> : <><ShieldCheck size={13} /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Documents Modal */}
      {viewingDocs && (
        <div className="modal-overlay" onClick={() => setViewingDocs(null)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-800">KYC Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">{viewingDocs.name}</p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              {[['CNIC Front', viewingDocs.cnicFrontUrl], ['CNIC Back', viewingDocs.cnicBackUrl], ['Selfie', viewingDocs.selfieUrl]].map(([label, url]) => (
                <div key={label}>
                  <p className="input-label">{label}</p>
                  {url ? (
                    <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={url} alt={label} className="w-full max-h-52 object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 h-24 flex items-center justify-center">
                      <p className="text-xs text-slate-400 italic">Not uploaded</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRider && (
        <div className="modal-overlay" onClick={() => setEditingRider(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-800">Edit Rider</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editingRider.name}</p>
              </div>
              <button onClick={() => setEditingRider(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              {[['Name', 'name', 'text'], ['Phone', 'phoneNumber', 'tel'], ['Email', 'email', 'email'], ['Vehicle Type', 'vehicleType', 'text'], ['Vehicle Number', 'vehicleNumber', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="input-label">{label}</label>
                  <input type={type} className="input" value={(editData as any)[key]} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary w-full justify-center py-3">
                {savingEdit ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
