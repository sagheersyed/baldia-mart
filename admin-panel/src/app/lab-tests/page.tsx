'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, Pencil, FlaskConical, Search, 
  Beaker, Clipboard, Clock, DollarSign, Image as ImageIcon, AlertCircle,
  CalendarDays
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { showToast } from '@/hooks/useToast';
import LabAvailabilityModal from '@/components/LabAvailabilityModal';

interface LabTest {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  sampleType?: string;
  preparationInstructions?: string;
  turnaroundTime?: string;
  imageUrl?: string;
  isActive: boolean;
}

const API_URL = `${BASE_URL}/pharma/lab/tests`;
const ADMIN_API_URL = `${BASE_URL}/pharma/lab/admin/tests`;

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'Blood Test',
  price: '',
  sampleType: 'Blood',
  preparationInstructions: '',
  turnaroundTime: '24 Hours',
  imageUrl: '',
  isActive: true,
};

export default function LabTestsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load tests'));
      const payload = await res.json();
      setTests(Array.isArray(payload) ? payload : (payload.data || []));
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load tests'), variant: 'error' });
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
      
      const body = {
        ...formData,
        price: parseFloat(formData.price),
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
        fetchTests();
        showToast({ title: editingId ? 'Test updated' : 'Test added', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save test'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save test'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (t: LabTest) => {
    setEditingId(t.id);
    setFormData({
      name: t.name,
      description: t.description || '',
      category: t.category,
      price: t.price.toString(),
      sampleType: t.sampleType || '',
      preparationInstructions: t.preparationInstructions || '',
      turnaroundTime: t.turnaroundTime || '',
      imageUrl: t.imageUrl || '',
      isActive: t.isActive,
    });
    setShowModal(true);
  };

  const filteredTests = tests.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title text-indigo-700">Laboratory Tests</h1>
          <p className="page-subtitle">Manage diagnostic tests and home sample collection catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search tests..."
              className="input pl-10 w-64 border-indigo-100 focus:border-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowAvailability(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl flex items-center gap-2 border border-indigo-200 transition-all font-bold text-sm">
            <CalendarDays size={18} /> Manage Slots
          </button>
          <button onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <Plus size={18} /> Add Lab Test
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Category</th>
                <th className="text-center">Sample</th>
                <th className="text-center">TAT</th>
                <th className="text-center">Price</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && tests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading test catalog…</td></tr>
              ) : filteredTests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No tests found. Add your first diagnostic test.</td></tr>
              ) : filteredTests.map(test => (
                <tr key={test.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <Beaker size={20} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{test.name}</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{test.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge-gray">{test.category}</span></td>
                  <td className="text-center text-sm font-medium text-slate-600">{test.sampleType || 'N/A'}</td>
                  <td className="text-center">
                    <div className="flex flex-col items-center">
                       <Clock size={12} className="text-slate-300 mb-0.5" />
                       <span className="text-[11px] font-bold text-slate-500">{test.turnaroundTime || '--'}</span>
                    </div>
                  </td>
                  <td className="text-center font-black text-indigo-700">Rs. {Number(test.price).toFixed(0)}</td>
                  <td className="text-center">
                    <span className={test.isActive ? 'badge-green' : 'badge-gray'}>{test.isActive ? 'Active' : 'Hidden'}</span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleEdit(test)} className="btn-ghost btn-icon text-indigo-600 border-indigo-100"><Pencil size={14} /></button>
                      <button className="btn-ghost btn-icon text-red-500 border-red-100"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-indigo-50 bg-indigo-50/30">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FlaskConical className="text-indigo-600" size={20} />
                {editingId ? 'Edit Lab Test' : 'Add New Lab Test'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Test Name *</label>
                  <input required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Complete Blood Count (CBC)" />
                </div>
                <div>
                  <label className="input-label">Category *</label>
                  <select required className="input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Blood Test">Blood Test</option>
                    <option value="Urine Test">Urine Test</option>
                    <option value="Radiology">Radiology (X-Ray/Ultrasound)</option>
                    <option value="Biopsy">Biopsy</option>
                    <option value="Allergy Test">Allergy Test</option>
                    <option value="Cardiac Test">Cardiac Test</option>
                    <option value="Hormone Test">Hormone Test</option>
                    <option value="PCR / COVID-19">PCR / COVID-19</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Price (Rs.) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="number" className="input pl-10 font-bold" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="input-label">Sample Type</label>
                  <input className="input" value={formData.sampleType} onChange={e => setFormData({ ...formData, sampleType: e.target.value })} placeholder="e.g. Blood" />
                </div>
                <div>
                  <label className="input-label">Turnaround Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input className="input pl-10" value={formData.turnaroundTime} onChange={e => setFormData({ ...formData, turnaroundTime: e.target.value })} placeholder="e.g. 24 Hours" />
                  </div>
                </div>
              </div>

              <div>
                <label className="input-label">Description</label>
                <textarea className="input min-h-[60px] py-2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Briefly describe what this test detects..." />
              </div>

              <div>
                <label className="input-label">Preparation Instructions</label>
                <div className="relative">
                  <Clipboard className="absolute left-3 top-3 text-slate-300" size={16} />
                  <textarea className="input pl-10 min-h-[60px] py-2" value={formData.preparationInstructions} onChange={e => setFormData({ ...formData, preparationInstructions: e.target.value })} placeholder="e.g. 8-12 hours fasting required, avoid caffeine..." />
                </div>
              </div>

              <div>
                <label className="input-label">Banner Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input className="input pl-10" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="test-active" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="test-active" className="text-sm font-bold text-slate-700 cursor-pointer">Test is Active & Visible to Customers</label>
              </div>

              <div className="modal-footer border-t border-slate-100 pt-6">
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Saving Test...' : editingId ? 'Update Lab Test' : 'Add to Laboratory Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAvailability && (
        <LabAvailabilityModal onClose={() => setShowAvailability(false)} />
      )}
    </div>
  );
}
