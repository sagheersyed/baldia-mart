'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Plus, Trash2, Edit3, Save, X, 
  Package, AlertTriangle, CheckCircle, RefreshCcw, 
  Pill, Activity, Clock, ShieldAlert
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface InventoryItem {
  id: string;
  medicineId: string;
  medicine: {
    name: string;
    genericName?: string;
    dosageForm?: string;
    strength?: string;
    mrp: number;
  };
  stockQuantity: number;
  reservedQuantity: number;
  priceOverride?: number;
  expiryDate?: string;
  isAvailable: boolean;
  isQuarantined: boolean;
  batchNumber?: string;
}

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
}

export default function PharmacyInventoryPage() {
  const { id: pharmacyId } = useParams();
  const router = useRouter();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    medicineId: '',
    stockQuantity: '0',
    priceOverride: '',
    expiryDate: '',
    batchNumber: '',
    isAvailable: true
  });

  useEffect(() => {
    fetchData();
    fetchMedicines();
  }, [pharmacyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Pharmacy Details
      const pRes = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${pharmacyId}`);
      if (pRes.ok) setPharmacy(await pRes.json());

      // Fetch Inventory
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${pharmacyId}/inventory`);
      if (res.ok) {
        const payload = await res.json();
        setInventory(Array.isArray(payload.data) ? payload.data : []);
      }
    } catch (err) {
      showToast({ title: 'Failed to load inventory', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/medicines/search?limit=100`);
      if (res.ok) {
        const payload = await res.json();
        setMedicines(payload.data || []);
      }
    } catch (err) {}
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${pharmacyId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          stockQuantity: parseInt(formData.stockQuantity),
          priceOverride: formData.priceOverride ? parseFloat(formData.priceOverride) : null
        }),
      });

      if (res.ok) {
        showToast({ title: 'Inventory updated', variant: 'success' });
        setShowAddModal(false);
        setFormData({
          medicineId: '',
          stockQuantity: '0',
          priceOverride: '',
          expiryDate: '',
          batchNumber: '',
          isAvailable: true
        });
        fetchData();
      } else {
        showToast({ title: await parseApiError(res, 'Update failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: 'Error updating inventory', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInventoryItem = async (invId: string) => {
    if (!confirm('Remove this item from inventory?')) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/inventory/${invId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setInventory(prev => prev.filter(item => item.id !== invId));
        showToast({ title: 'Item removed', variant: 'success' });
      }
    } catch (err) {
      showToast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.medicine.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-slate-900">Inventory</h1>
                <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Live</span>
              </div>
              <p className="text-slate-500 font-medium">Managing stock for <span className="text-teal-600 font-bold">{pharmacy?.name || 'Pharmacy'}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="Search inventory..."
                className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-64 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
            >
              <Plus size={18} /> Add Stock
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Package size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Total SKUs</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inventory.length}</h3>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Low Stock</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inventory.filter(i => i.stockQuantity < 10).length}</h3>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <ShieldAlert size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Near Expiry</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inventory.filter(i => i.isQuarantined).length}</h3>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <Clock size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Active Orders</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inventory.reduce((acc, i) => acc + i.reservedQuantity, 0)}</h3>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Medicine Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Stock Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Pricing</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Compliance</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCcw className="animate-spin text-teal-600" size={32} />
                      <p className="text-slate-400 font-bold">Synchronizing inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Pill className="text-slate-200" size={48} />
                      <p className="text-slate-400 font-bold text-lg">No stock records found</p>
                      <button onClick={() => setShowAddModal(true)} className="text-teal-600 font-black text-sm uppercase tracking-widest hover:underline mt-2">Add your first item</button>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all border border-slate-100">
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{item.medicine.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{item.medicine.genericName} • {item.medicine.strength}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-lg font-black text-slate-900 leading-none">{item.stockQuantity}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Available</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100 mx-2" />
                      <div className="text-center opacity-50">
                        <p className="text-sm font-bold text-slate-500 leading-none">{item.reservedQuantity}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Held</p>
                      </div>
                      {item.stockQuantity < 10 && (
                        <span className="ml-4 bg-amber-50 text-amber-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">Low</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    <p className="font-black text-slate-900">Rs. {item.priceOverride || item.medicine.mrp}</p>
                    {item.priceOverride && (
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Custom Price</p>
                    )}
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={item.isQuarantined ? 'text-red-500' : 'text-slate-400'} />
                        <span className={`text-[11px] font-bold ${item.isQuarantined ? 'text-red-500' : 'text-slate-500'}`}>
                          Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[11px] font-black uppercase tracking-tighter text-slate-400">{item.isAvailable ? 'Live' : 'Hidden'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                      <button onClick={() => deleteInventoryItem(item.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-8 border-b border-slate-50">
              <h2 className="text-2xl font-black text-slate-900">Add Inventory</h2>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddStock} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Medicine *</label>
                <select 
                  required 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none font-bold text-slate-800"
                  value={formData.medicineId}
                  onChange={e => setFormData({ ...formData, medicineId: e.target.value })}
                >
                  <option value="">Select a medicine...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Quantity *</label>
                  <input 
                    required 
                    type="number"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800"
                    value={formData.stockQuantity}
                    onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Override Price (Optional)</label>
                  <input 
                    type="number"
                    placeholder="M.R.P default"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800"
                    value={formData.priceOverride}
                    onChange={e => setFormData({ ...formData, priceOverride: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expiry Date</label>
                  <input 
                    type="date"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none font-bold text-slate-800"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Batch Number</label>
                  <input 
                    placeholder="BN-XXXX"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  checked={formData.isAvailable} 
                  onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-6 h-6 accent-teal-600"
                />
                <span className="font-bold text-slate-700">Make this medicine live for customers</span>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 bg-teal-600 text-white rounded-2xl font-black text-xl hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm Stock Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
