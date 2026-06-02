'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Package, Search, Save, Plus, ArrowLeft, Pill, AlertTriangle, ChevronRight, X
} from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface InventoryItem {
  id: string;
  medicineId: string;
  stockQuantity: number;
  shelfLocation?: string;
  priceOverride?: number;
  medicine: {
    name: string;
    genericName: string;
    mrp: number;
    dosageForm: string;
  };
}

export default function PharmacyInventoryPage() {
  const { id } = useParams();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [masterMedicines, setMasterMedicines] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<any | null>(null);
  const [initialQty, setInitialQty] = useState('0');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [id]);

  useEffect(() => {
    if (!showLinkModal) return;
    const delayDebounce = setTimeout(() => {
      searchMasterMedicines();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [modalSearch, showLinkModal]);

  const searchMasterMedicines = async () => {
    setModalLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/medicines/search?query=${modalSearch}&limit=20`);
      const payload = await res.json();
      setMasterMedicines(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleLinkMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    try {
      const qty = parseInt(initialQty) || 0;
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: selectedMed.id, quantity: qty }),
      });

      if (res.ok) {
        showToast({ title: 'Medicine linked to pharmacy successfully', variant: 'success' });
        setShowLinkModal(false);
        setSelectedMed(null);
        setInitialQty('0');
        setModalSearch('');
        fetchInventory();
      } else {
        showToast({ title: 'Failed to link medicine', variant: 'error' });
      }
    } catch (err) {
      showToast({ title: 'Failed to link medicine', variant: 'error' });
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // In a real B2B portal, this would use /pharma/b2b/inventory
      // But for admin-level management of a pharmacy, we fetch by pharmacyId
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${id}/inventory`);
      const payload = await res.json();
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
      setInventory(items);
    } catch (err) {
      showToast({ title: 'Failed to load inventory', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (medicineId: string, quantity: number) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/pharmacies/${id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId, quantity }),
      });

      if (res.ok) {
        showToast({ title: 'Stock updated', variant: 'success' });
        setEditingId(null);
        fetchInventory();
      }
    } catch (err) {
      showToast({ title: 'Update failed', variant: 'error' });
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.medicine.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/pharmacies/${id}`} className="btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">Pharmacy Inventory</h1>
          <p className="page-subtitle">Manage local stock levels & shelf locations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats */}
        <div className="card p-4 flex items-center gap-4 border-l-4 border-teal-500">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total SKUs</p>
            <p className="text-2xl font-black">{inventory.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 border-l-4 border-amber-500">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Low Stock</p>
            <p className="text-2xl font-black">{inventory.filter(i => i.stockQuantity < 10).length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="input pl-10" 
            placeholder="Search local inventory..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => setShowLinkModal(true)} className="btn-primary">
          <Plus size={16} /> Link Master Medicine
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine Details</th>
              <th className="text-center">Form</th>
              <th className="text-center">Current Stock</th>
              <th className="text-center">Location</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-20 text-slate-400">Loading shelf data…</td></tr>
            ) : filteredInventory.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-20 text-slate-400">No items found in this pharmacy.</td></tr>
            ) : filteredInventory.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                      <Pill size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.medicine.name}</p>
                      <p className="text-xs text-slate-500">{item.medicine.genericName}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <span className="badge-gray">{item.medicine.dosageForm}</span>
                </td>
                <td className="text-center">
                  {editingId === item.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <input 
                        type="number" 
                        className="input w-20 text-center py-1" 
                        value={editQty}
                        onChange={e => setEditQty(e.target.value)}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleUpdateStock(item.medicineId, parseInt(editQty))}
                        className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p className={`font-black text-lg ${item.stockQuantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                        {item.stockQuantity}
                      </p>
                      {item.stockQuantity < 10 && <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Low Stock</p>}
                    </div>
                  )}
                </td>
                <td className="text-center text-slate-500 text-sm italic">
                  {item.shelfLocation || 'Not Assigned'}
                </td>
                <td className="text-right">
                  <button 
                    onClick={() => { setEditingId(item.id); setEditQty(item.stockQuantity.toString()); }}
                    className="btn-ghost btn-sm text-blue-600 font-bold"
                  >
                    Quick Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLinkModal && (
        <div className="modal-overlay" onClick={() => { setShowLinkModal(false); setSelectedMed(null); }}>
          <div className="modal-box max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-bold text-slate-800 text-lg">Link Master Medicine</h2>
              <button onClick={() => { setShowLinkModal(false); setSelectedMed(null); }} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleLinkMedicine} className="modal-body space-y-4">
              <div>
                <label className="input-label">Search Master Medicine Catalog</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    placeholder="Type to search e.g. Panadol..." 
                    className="input pl-10" 
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                  />
                </div>
              </div>

              {selectedMed ? (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-teal-900">{selectedMed.name}</p>
                    <p className="text-xs text-teal-700">{selectedMed.genericName || 'No generic name'}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Dosage Form: {selectedMed.dosageForm} | MRP: Rs. {selectedMed.mrp}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedMed(null)}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {modalLoading ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
                  ) : masterMedicines.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">No medicines found. Type to search above.</div>
                  ) : masterMedicines.map(med => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => setSelectedMed(med)}
                      className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{med.name}</p>
                        <p className="text-xs text-slate-400">{med.genericName}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{med.dosageForm}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedMed && (
                <div>
                  <label className="input-label">Initial Stock Quantity</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    className="input" 
                    value={initialQty} 
                    onChange={e => setInitialQty(e.target.value)} 
                  />
                </div>
              )}

              <div className="modal-footer pt-4">
                <button 
                  type="submit" 
                  disabled={!selectedMed}
                  className="btn-primary w-full py-2.5 font-bold"
                >
                  Link Selected Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
