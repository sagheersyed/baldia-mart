'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, Pencil, Activity, Package, Search, 
  Tag, Pill, Droplets, FlaskConical, Stethoscope, AlertCircle, Star
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  mrp: number;
  discount?: number;
  categoryId: string;
  brandId?: string;
  category?: { name: string };
  image_url?: string;
  isActive: boolean;
  requiresPrescription: boolean;
  isEmergency: boolean;
  isOtc?: boolean;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  isFeatured: boolean;
  itemType: string;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  section: string;
}

const API_URL = `${BASE_URL}/pharma/medicines`;

const EMPTY_FORM = {
  name: '',
  genericName: '',
  mrp: '',
  discount: '',
  categoryId: '',
  brandId: '',
  imageUrl: '',
  isActive: true,
  requiresPrescription: false,
  isEmergency: false,
  isOtc: true,
  dosageForm: 'Tablet',
  strength: '',
  packSize: '',
  isFeatured: false,
  itemType: 'medicine',
  tags: '',
};

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchMedicines(1);
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/medicines/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/brands?section=pharma`);
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load brands');
    }
  };

  const fetchMedicines = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/search?page=${targetPage}&limit=20`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load medicines'));
      const payload = await res.json();
      setMedicines(Array.isArray(payload.data) ? payload.data : []);
      setTotalPages(payload.totalPages || 1);
      setTotalItems(payload.total || 0);
      setPage(targetPage);
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load medicines'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (m: Medicine, flag: 'isFeatured' | 'isActive') => {
    const next = !m[flag];
    setMedicines(prev => prev.map(x => x.id === m.id ? { ...x, [flag]: next } : x));
    try {
      const res = await fetchWithAuth(`${API_URL}/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: next }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update flag'));
      showToast({ title: `${flag === 'isFeatured' ? 'Featured' : 'Status'} updated`, variant: 'success' });
    } catch (err) {
      setMedicines(prev => prev.map(x => x.id === m.id ? { ...x, [flag]: !next } : x));
      showToast({ title: getErrorMessage(err, 'Failed to update flag'), variant: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? 'PUT' : 'POST';
      const body = {
        ...formData,
        mrp: parseFloat(formData.mrp),
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        fetchMedicines();
        showToast({ title: editingId ? 'Medicine updated' : 'Medicine added', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save medicine'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save medicine'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this medicine?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMedicines();
        showToast({ title: 'Medicine deactivated', variant: 'success' });
      }
    } catch (err) {
      showToast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setFormData({
      name: m.name,
      genericName: m.genericName || '',
      mrp: m.mrp.toString(),
      discount: m.discount?.toString() || '',
      categoryId: m.categoryId || '',
      brandId: m.brandId || '',
      imageUrl: m.imageUrl || '',
      isActive: m.isActive,
      requiresPrescription: m.requiresPrescription,
      isEmergency: m.isEmergency,
      isOtc: m.isOtc,
      dosageForm: m.dosageForm || 'Tablet',
      strength: m.strength || '',
      packSize: m.packSize || '',
      isFeatured: m.isFeatured || false,
      itemType: m.itemType || 'medicine',
      tags: m.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicines</h1>
          <p className="page-subtitle">Master pharmacopeia catalog · {medicines.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search catalog..."
              className="input pl-10 w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> Add Medicine
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th className="text-center">Price</th>
                <th className="text-center">Reqs</th>
                <th className="text-center">Featured</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && medicines.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading master catalog…</td></tr>
              ) : filteredMedicines.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Pill size={20} className="text-teal-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400 italic">{m.genericName || 'No generic name'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-gray">{m.category?.name || 'Uncategorized'}</span>
                  </td>
                  <td className="text-center">
                    <p className="font-black text-slate-700">Rs. {Number(m.mrp).toFixed(0)}</p>
                    {(m.discount ?? 0) > 0 && <p className="text-[10px] text-green-600 font-bold">-{m.discount} OFF</p>}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-1">
                      {m.requiresPrescription && <span title="Rx Required" className="w-5 h-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">Rx</span>}
                      {m.isEmergency && <span title="Emergency" className="w-5 h-5 rounded bg-red-100 text-red-700 flex items-center justify-center"><AlertCircle size={10} /></span>}
                      {m.isOtc && <span title="OTC Medicine" className="w-8 h-5 rounded bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-black">OTC</span>}
                    </div>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => toggleFlag(m, 'isFeatured')}
                      className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center m-auto ${
                        m.isFeatured ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-300'
                      }`}
                    >
                      <Star size={14} fill={m.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="text-center">
                    <button 
                      onClick={() => toggleFlag(m, 'isActive')}
                      className={m.isActive ? 'badge-green cursor-pointer' : 'badge-gray cursor-pointer'}
                    >
                      {m.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleEdit(m)} className="btn-ghost btn-icon text-blue-600 border-blue-100"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(m.id)} className="btn-ghost btn-icon text-red-500 border-red-100"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{medicines.length}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> items
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => fetchMedicines(page - 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <div className="flex items-center px-3 text-sm font-semibold text-slate-700">
              Page {page} of {totalPages}
            </div>
            <button 
              disabled={page >= totalPages} 
              onClick={() => fetchMedicines(page + 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-bold text-slate-800 text-lg">{editingId ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Product Name *</label>
                  <input required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Panadol 500mg" />
                </div>
                <div>
                  <label className="input-label">Generic Name</label>
                  <input className="input" value={formData.genericName} onChange={e => setFormData({ ...formData, genericName: e.target.value })} placeholder="e.g. Paracetamol" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">MRP (Rs.) *</label>
                  <input required type="number" className="input" value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Discount (Rs.)</label>
                  <input type="number" className="input" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Category *</label>
                  <select required className="input" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Brand</label>
                <select className="input" value={formData.brandId} onChange={e => setFormData({ ...formData, brandId: e.target.value })}>
                  <option value="">Select Brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Dosage Form</label>
                  <select className="input" value={formData.dosageForm} onChange={e => setFormData({ ...formData, dosageForm: e.target.value })}>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream / Ointment</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Strength</label>
                  <input className="input" value={formData.strength} onChange={e => setFormData({ ...formData, strength: e.target.value })} placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="input-label">Pack Size</label>
                  <input className="input" value={formData.packSize} onChange={e => setFormData({ ...formData, packSize: e.target.value })} placeholder="e.g. 10 tablets" />
                </div>
              </div>

              <div>
                <label className="input-label">Image URL</label>
                <input className="input" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.requiresPrescription} onChange={e => setFormData({ ...formData, requiresPrescription: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm font-bold text-slate-700">Requires Prescription (Rx)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isEmergency} onChange={e => setFormData({ ...formData, isEmergency: e.target.checked })} className="w-4 h-4 accent-red-600" />
                  <span className="text-sm font-bold text-slate-700">Emergency Medicine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} className="w-4 h-4 accent-amber-600" />
                  <span className="text-sm font-bold text-slate-700">Featured (on Home)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isOtc} onChange={e => setFormData({ ...formData, isOtc: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                  <span className="text-sm font-bold text-slate-700">Over The Counter (OTC)</span>
                </label>
              </div>

              <div>
                <label className="input-label">Tags / Conditions</label>
                <input className="input" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="pain-relief, fever, headache (comma separated)" />
              </div>

              <div>
                <label className="input-label">Product Type *</label>
                <select required className="input" value={formData.itemType} onChange={e => setFormData({ ...formData, itemType: e.target.value })}>
                  <option value="medicine">Medicine</option>
                  <option value="device">Device / Electronic</option>
                  <option value="supplement">Supplement</option>
                  <option value="healthcare">Healthcare Item</option>
                </select>
              </div>

              <div className="modal-footer pt-6">
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-lg">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Medicine' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
