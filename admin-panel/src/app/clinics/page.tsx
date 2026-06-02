'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, Pencil, MapPin, Search, 
  Building2, Globe, ImageIcon, ExternalLink
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface Clinic {
  id: string;
  name: string;
  address: string;
  mapUrl?: string;
  imageUrl?: string;
  type: string;
}

const API_URL = `${BASE_URL}/pharma/telemedicine/clinics`;
const ADMIN_API_URL = `${BASE_URL}/pharma/telemedicine/admin/clinics`;

const EMPTY_FORM = {
  name: '',
  address: '',
  mapUrl: '',
  imageUrl: '',
  type: 'Clinic',
};

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load clinics'));
      const payload = await res.json();
      setClinics(Array.isArray(payload) ? payload : (payload.data || []));
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load clinics'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId ? `${ADMIN_API_URL}/${editingId}` : ADMIN_API_URL;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        fetchClinics();
        showToast({ title: editingId ? 'Clinic updated' : 'Clinic added', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save clinic'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save clinic'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (c: Clinic) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      address: c.address,
      mapUrl: c.mapUrl || '',
      imageUrl: c.imageUrl || '',
      type: c.type,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return;
    try {
      const res = await fetchWithAuth(`${ADMIN_API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ title: 'Clinic deleted', variant: 'success' });
        fetchClinics();
      } else {
        showToast({ title: await parseApiError(res, 'Failed to delete clinic'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: 'Operation failed', variant: 'error' });
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title text-indigo-700">Clinics & Hospitals</h1>
          <p className="page-subtitle">Manage practice locations for telemedicine consultations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search locations..."
              className="input pl-10 w-64 border-indigo-100 focus:border-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <Plus size={18} /> Add Location
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse space-y-4">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-32 bg-slate-50 rounded" />
            </div>
          ))
        ) : filteredClinics.length === 0 ? (
          <div className="col-span-full card p-20 text-center text-slate-400">
            <Building2 className="mx-auto mb-4 opacity-10" size={80} />
            <p>No clinics found. Add your first location to get started.</p>
          </div>
        ) : filteredClinics.map(clinic => (
          <div key={clinic.id} className="card group hover:border-indigo-500 transition-all border-2 border-transparent overflow-hidden">
            <div className="relative h-32 bg-indigo-50 overflow-hidden">
              {clinic.imageUrl ? (
                <img src={normalizeUrl(clinic.imageUrl)} className="w-full h-full object-cover" alt={clinic.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 size={40} className="text-indigo-200" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => handleEdit(clinic)} className="p-2 bg-white/90 hover:bg-white text-indigo-600 rounded-lg shadow-sm transition-all">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(clinic.id)} className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow-sm transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                  {clinic.type}
                </span>
              </div>
            </div>
            
            <div className="p-5">
              <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2">{clinic.name}</h3>
              <div className="flex items-start gap-2 text-slate-500 mb-4">
                <MapPin size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-sm leading-snug">{clinic.address}</p>
              </div>
              
              {clinic.mapUrl && (
                <a 
                  href={clinic.mapUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <Globe size={14} /> View on Google Maps <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-indigo-50 bg-indigo-50/30">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Building2 className="text-indigo-600" size={20} />
                {editingId ? 'Edit Location' : 'Register New Location'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-5 p-6">
              <div>
                <label className="input-label">Clinic/Hospital Name *</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. City Hospital Lahore" />
              </div>

              <div>
                <label className="input-label">Address *</label>
                <textarea required className="input min-h-[80px] py-2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full address including area and city..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Type</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Clinic">Clinic</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Lab">Lab</option>
                    <option value="Video Room">Video Room</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Map URL (Google Maps)</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input className="input pl-10" value={formData.mapUrl} onChange={e => setFormData({ ...formData, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                  </div>
                </div>
              </div>

              <div>
                <label className="input-label">Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input className="input pl-10" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              <div className="modal-footer border-t border-slate-100 pt-6">
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Saving Location...' : editingId ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
