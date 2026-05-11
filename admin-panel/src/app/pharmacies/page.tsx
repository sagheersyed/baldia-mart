'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, X, Pencil, MapPin, Activity, CheckCircle, 
  XCircle, Package, ShieldCheck, FileText, User, Phone, 
  Clock, Check, AlertCircle, Search
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface Pharmacy {
  id: string;
  name: string;
  licenseNumber: string;
  pharmacistName?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  onboardingStatus: 'pending' | 'documents_submitted' | 'under_review' | 'approved' | 'rejected';
  isVerified: boolean;
  isActive: boolean;
  isOpen: boolean;
  rating: number;
  ratingCount: number;
  latitude?: number;
  longitude?: number;
  zoneId?: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  isActive: boolean;
}

const API_URL = `${BASE_URL}/pharma/pharmacies`;

const emptyPharmacyForm = {
  name: '',
  licenseNumber: '',
  pharmacistName: '',
  phoneNumber: '',
  email: '',
  address: '',
  onboardingStatus: 'pending',
  isVerified: false,
  isActive: true,
  isOpen: true,
  zoneId: '',
  latitude: '',
  longitude: ''
};

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyPharmacyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPharmacies();
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/delivery-zones/all`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch zones'));
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  };

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch pharmacies'));
      const data = await res.json();
      setPharmacies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pharmacies:', err);
      showToast({ title: getErrorMessage(err, 'Failed to load pharmacies'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId ? `${BASE_URL}/pharma/pharmacies/${editingId}` : `${BASE_URL}/pharma/pharmacies/register`;
      const method = editingId ? 'PATCH' : 'POST';
      
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setForm(emptyPharmacyForm);
        fetchPharmacies();
        showToast({ title: editingId ? 'Pharmacy updated' : 'Pharmacy registered', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save pharmacy'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Submission failed'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingStatus: status, isVerified: status === 'approved' }),
      });
      if (res.ok) {
        fetchPharmacies();
        showToast({ title: `Status updated to ${status}`, variant: 'success' });
      }
    } catch (err) {
      showToast({ title: 'Status update failed', variant: 'error' });
    }
  };

  const deletePharmacy = async (id: string) => {
    if (!confirm('Are you sure you want to remove this pharmacy?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPharmacies();
        showToast({ title: 'Pharmacy removed', variant: 'success' });
      }
    } catch (err) {
      showToast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const openEdit = (p: Pharmacy) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      licenseNumber: p.licenseNumber,
      pharmacistName: p.pharmacistName || '',
      phoneNumber: p.phoneNumber,
      email: p.email || '',
      address: p.address || '',
      onboardingStatus: p.onboardingStatus,
      isVerified: p.isVerified,
      isActive: p.isActive,
      isOpen: p.isOpen,
      zoneId: p.zoneId || '',
      latitude: p.latitude?.toString() || '',
      longitude: p.longitude?.toString() || ''
    });
    setShowModal(true);
  };

  const filteredPharmacies = pharmacies.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.onboardingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">🩺 Pharmacies</h1>
            <p className="text-slate-500 font-medium mt-1">Pharmacy onboarding, license verification, and inventory control</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="Search by name or license..."
                className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-64 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => { setEditingId(null); setForm(emptyPharmacyForm); setShowModal(true); }}
              className="flex items-center space-x-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
            >
              <Plus size={18} />
              <span>Register Pharmacy</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPharmacies.map(pharma => (
              <div key={pharma.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                      <Activity size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{pharma.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                          <FileText size={12} /> {pharma.licenseNumber}
                        </span>
                        {pharma.isVerified && (
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                            <ShieldCheck size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => router.push(`/pharmacies/${pharma.id}/inventory`)} 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Manage Inventory"
                    >
                      <Package size={18} />
                    </button>
                    <button onClick={() => openEdit(pharma)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => deletePharmacy(pharma.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <User size={14} className="text-slate-400" /> {pharma.pharmacistName || 'No Pharmacist'}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Phone size={14} className="text-slate-400" /> {pharma.phoneNumber}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <MapPin size={14} className="text-slate-400" /> {pharma.address || 'No Address'}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Clock size={14} className={`text-slate-400 ${pharma.isOpen ? 'text-green-500' : 'text-red-500'}`} /> 
                      {pharma.isOpen ? 'Accepting Orders' : 'Store Closed'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      pharma.onboardingStatus === 'approved' ? 'bg-green-100 text-green-700' :
                      pharma.onboardingStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {pharma.onboardingStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {pharma.onboardingStatus !== 'approved' && (
                      <button 
                        onClick={() => updateStatus(pharma.id, 'approved')}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-all"
                      >
                        <Check size={14} /> Approve
                      </button>
                    )}
                    {pharma.onboardingStatus !== 'rejected' && (
                      <button 
                        onClick={() => updateStatus(pharma.id, 'rejected')}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-xs transition-all"
                      >
                        <AlertCircle size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPharmacies.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <Activity className="mx-auto h-16 w-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No pharmacies found</h3>
            <p className="text-slate-300 mt-2">Try adjusting your filters or register a new pharmacy.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-8 border-b border-slate-50">
              <h2 className="text-3xl font-black text-slate-900">{editingId ? 'Edit Pharmacy' : 'Register Pharmacy'}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pharmacy Name *</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Drug License No *</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800" value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lead Pharmacist</label>
                  <input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800" value={form.pharmacistName} onChange={e => setForm({ ...form, pharmacistName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Contact Phone *</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Address</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800 resize-none" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Delivery Zone</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none font-bold text-slate-800" value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value })}>
                    <option value="">Select a zone...</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4 items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-6 h-6 accent-teal-600" />
                    <span className="font-bold text-slate-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isOpen} onChange={e => setForm({ ...form, isOpen: e.target.checked })} className="w-6 h-6 accent-teal-600" />
                    <span className="font-bold text-slate-700">Accepting Orders</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full h-16 bg-teal-600 text-white rounded-2xl font-black text-xl hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : editingId ? 'Update Information' : 'Register Pharmacy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
