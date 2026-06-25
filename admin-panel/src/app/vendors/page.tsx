'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, Pencil, MapPin, Store, CheckCircle, XCircle, 
  Package, RefreshCw, Search, ArrowRight, ShieldCheck, Zap, 
  LayoutGrid, List, Filter, Activity, Globe, Info
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface Vendor {
  id: string;
  name: string;
  type: string;
  address?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  isOpen: boolean;
  openingHours?: string;
  openingTime?: string;
  closingTime?: string;
  location?: string;
  zoneId?: string;
  zone?: DeliveryZone;
  vendorProducts?: VendorProduct[];
}

interface DeliveryZone {
  id: string;
  name: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface VendorProduct {
  id: string;
  productId: string;
  product?: Product;
  price: number;
  stockQty: number;
  isAvailable: boolean;
}

const API_URL = `${BASE_URL}/vendors`;
const PRODUCTS_API = `${BASE_URL}/products`;

const emptyVendorForm = {
  name: '', type: 'grocery', address: '', location: '', lat: '', lng: '', isOpen: true, isActive: true, 
  openingHours: '09:00 AM - 11:00 PM', openingTime: '09:00', closingTime: '23:00', zoneId: ''
};

const emptyVendorProductForm = {
  productId: '', price: '', stockQty: '50', isAvailable: true
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showVendorProductModal, setShowVendorProductModal] = useState(false);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [vpForm, setVpForm] = useState(emptyVendorProductForm);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchVendors();
    void fetchProducts();
    void fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/delivery-zones/all`);
      if (res.ok) {
        const data = await res.json();
        setZones(Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []));
      }
    } catch (err) { console.error(err); }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast({ title: 'Failed to sync vendors', variant: 'error' });
    } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth(PRODUCTS_API);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []));
      }
    } catch (err) { console.error(err); }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingVendor ? `${API_URL}/${editingVendor.id}` : API_URL;
      const method = editingVendor ? 'PATCH' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vendorForm,
          lat: vendorForm.lat ? parseFloat(vendorForm.lat) : null,
          lng: vendorForm.lng ? parseFloat(vendorForm.lng) : null,
        }),
      });
      if (res.ok) {
        setShowVendorModal(false);
        setEditingVendor(null);
        fetchVendors();
        showToast({ title: 'System Node Updated', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Update failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: 'Transmission error', variant: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleVendorProductSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVendor || !vpForm.productId) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${selectedVendor.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: vpForm.productId,
          price: parseFloat(vpForm.price) || 0,
          stockQty: parseInt(vpForm.stockQty) || 0,
          isAvailable: vpForm.isAvailable
        }),
      });
      if (res.ok) {
        setShowVendorProductModal(false);
        fetchVendors();
        showToast({ title: 'Resource Mapped', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Mapping failed'), variant: 'error' });
      }
    } catch (err) { 
      showToast({ title: 'System communication failure', variant: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteVendorProduct = async (vendorId: string, vpId: string) => {
    if (!confirm('Unmap this resource from the node?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${vendorId}/products/${vpId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVendors();
        showToast({ title: 'Resource Unmapped', variant: 'success' });
      }
    } catch (error) { console.error(error); }
  };

  const handleUpdateVendorProduct = async (vendorId: string, vpId: string, stock: number) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/${vendorId}/products/${vpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQty: stock })
      });
      if (res.ok) {
        fetchVendors();
        showToast({ title: 'Telemetrics Updated', variant: 'success' });
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Decommission this vendor node?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchVendors(); showToast({ title: 'Node Removed', variant: 'success' }); }
    } catch (err) { console.error(err); }
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name, type: v.type || 'grocery', address: v.address || '',
      location: v.location || '', lat: v.lat ? v.lat.toString() : '', 
      lng: v.lng ? v.lng.toString() : '', isOpen: v.isOpen, isActive: v.isActive,
      openingHours: v.openingHours || '', openingTime: v.openingTime || '',
      closingTime: v.closingTime || '', zoneId: v.zoneId || ''
    });
    setShowVendorModal(true);
  };

  const filteredVendors = selectedZoneFilter === 'all' 
    ? vendors 
    : vendors.filter(v => v.zoneId === selectedZoneFilter);

  return (
    <div className="page-container bg-[#FDFDFF]">
      <div className="max-w-[1600px] mx-auto">
        
        {/* ─── Architectural Header ───────────────────── */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-12 h-1 bg-indigo-600 rounded-full" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Node Management</span>
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Vendor<br/>Terminal</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-md leading-relaxed">
              Orchestrate local inventory nodes and geospatial delivery logic across the Baldia Mart network.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 p-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-1.5 px-4">
               <Filter size={14} className="text-slate-300" />
               <select 
                 className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
                 value={selectedZoneFilter}
                 onChange={(e) => setSelectedZoneFilter(e.target.value)}
               >
                 <option value="all">Global Sectors</option>
                 {zones.map(zone => (
                   <option key={zone.id} value={zone.id}>{zone.name}</option>
                 ))}
               </select>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex bg-slate-50 p-1 rounded-2xl">
               <button onClick={() => setViewMode('grid')} className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <LayoutGrid size={18} />
               </button>
               <button onClick={() => setViewMode('list')} className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List size={18} />
               </button>
            </div>
            <button
              onClick={() => { setEditingVendor(null); setVendorForm(emptyVendorForm); setShowVendorModal(true); }}
              className="btn-primary !h-14 !px-10"
            >
              <Plus size={20} />
              <span>Register Node</span>
            </button>
          </div>
        </div>

        {/* ─── Hero Intelligence ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {[
            { label: 'Network Nodes', value: vendors.length, icon: Store, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Active Sectors', value: zones.length, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Operational', value: vendors.filter(v => v.isOpen).length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Stock Units', value: vendors.reduce((acc, v) => acc + (v.vendorProducts?.length || 0), 0), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <div key={i} className="card p-8 flex items-center justify-between group">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
               </div>
               <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon size={24} />
               </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-[50vh] gap-6">
            <div className="relative">
               <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
               <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Syncing Grid Nodes...</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-10" : "space-y-8"}>
            {filteredVendors.map(vendor => {
              const searchTerm = productSearchTerms[vendor.id] || '';
              const vendorProducts = vendor.vendorProducts || [];
              const filteredVPs = vendorProducts.filter(vp => 
                (vp.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
              );

              return (
                <div key={vendor.id} className="card group relative flex flex-col h-full !rounded-[3rem] bg-white border-slate-100/50 shadow-2xl shadow-slate-200/20 active:scale-[0.99] transition-transform">
                  
                  {/* Card Header Layer */}
                  <div className="p-10 pb-0 shrink-0">
                    <div className="flex items-start justify-between mb-8">
                       <div className="flex gap-6">
                          <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-400/30 overflow-hidden relative group-hover:rotate-6 transition-transform duration-500">
                             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                             <Store size={32} />
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{vendor.name}</h2>
                                <span className="badge-purple">#{vendor.type}</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className={vendor.isOpen ? 'badge-green' : 'badge-red'}>
                                   <div className={`w-1.5 h-1.5 rounded-full mr-2 inline-block ${vendor.isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} />
                                   {vendor.isOpen ? 'Operational' : 'Disconnected'}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                   <MapPin size={12} className="text-indigo-600" />
                                   {vendor.location || 'Sector Zero'}
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={() => openEditVendor(vendor)} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl border border-slate-100 transition-all">
                             <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeleteVendor(vendor.id)} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl border border-slate-100 transition-all text-slate-300">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  </div>

                  {/* Operational Terminal */}
                  <div className="px-10 pb-10 flex-1 flex flex-col">
                     <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50 p-8 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-3">
                              <Zap size={16} className="text-indigo-600 animate-pulse" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Resource Grid · {vendorProducts.length} Units</p>
                           </div>
                           
                           <div className="relative group/search">
                              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-indigo-600" />
                              <input 
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setProductSearchTerms({ ...productSearchTerms, [vendor.id]: e.target.value })}
                                className="w-40 xl:w-56 bg-white border border-slate-100 rounded-full pl-10 pr-4 py-2.5 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all"
                              />
                           </div>
                        </div>

                        {vendorProducts.length > 0 ? (
                          <div className="max-h-[360px] overflow-y-auto pr-4 custom-scrollbar space-y-3">
                             {filteredVPs.map(vp => (
                               <div key={vp.id} className="group/item flex items-center justify-between bg-white border border-slate-100/50 p-5 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/30 transition-all">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-indigo-600 transition-colors">
                                        <Package size={20} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{vp.product?.name || 'Logistic Payload'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className="text-[10px] font-black text-indigo-600 tracking-tighter">RS. {vp.price}</span>
                                           <div className="w-1 h-1 rounded-full bg-slate-200" />
                                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vp.stockQty} In Stash</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <button 
                                       onClick={() => {
                                         const next = prompt('Enter new stock quantity:', vp.stockQty.toString());
                                         if (next !== null) handleUpdateVendorProduct(vendor.id, vp.id, parseInt(next));
                                       }}
                                       className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                       title="Quick Update Stock"
                                     >
                                        <RefreshCw size={14} />
                                     </button>
                                     <button 
                                       onClick={() => handleDeleteVendorProduct(vendor.id, vp.id)}
                                       className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                                       title="Unmap Resource"
                                     >
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-slate-200 rounded-[2rem] py-16">
                             <Package size={48} className="mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Payload Hub</p>
                          </div>
                        )}
                     </div>
                     
                     <div className="mt-8 flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={16} className="text-indigo-600" />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Sector Node</p>
                        </div>
                        <button
                          onClick={() => { setSelectedVendor(vendor); setVpForm(emptyVendorProductForm); setShowVendorProductModal(true); }}
                          className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:gap-4 transition-all"
                        >
                          Map New Resource <ArrowRight size={14} />
                        </button>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modals Redesign ───────────────────── */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-box !max-w-3xl">
            <div className="modal-header">
               <div className="space-y-2">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Protocol Authorization</span>
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                    {editingVendor ? 'Update Sector Hub' : 'Onboard Primary Node'}
                  </h2>
               </div>
               <button onClick={() => setShowVendorModal(false)} className="btn-ghost btn-icon !rounded-full"><X size={24} /></button>
            </div>
            <form onSubmit={handleVendorSubmit} className="modal-body space-y-10">
               
               <div className="grid grid-cols-2 gap-10">
                  <div className="col-span-2 space-y-4">
                     <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 border-l-4 border-indigo-600 pl-4">Identification Matrix</p>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-1">
                           <label className="input-label">Entity Name *</label>
                           <input required className="input w-full" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="Global Hub One" />
                        </div>
                        <div className="col-span-1">
                           <label className="input-label">Node Sector</label>
                           <select className="input w-full" value={vendorForm.type} onChange={e => setVendorForm({ ...vendorForm, type: e.target.value })}>
                              <option value="grocery">Logistic Center (Grocery)</option>
                              <option value="dairy">Dairy Exchange</option>
                              <option value="pharmacy">Medical Protocol Hub</option>
                              <option value="restaurants">Food Production Link</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="col-span-2 space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                     <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                           <MapPin size={14} className="text-indigo-600" /> Geospatial Routing
                        </p>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Ops</span>
                           <label className="w-14 h-8 bg-slate-200 rounded-full relative cursor-pointer group">
                              <input type="checkbox" className="hidden peer" checked={vendorForm.isOpen} onChange={e => setVendorForm({ ...vendorForm, isOpen: e.target.checked })} />
                              <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-6 peer-checked:bg-indigo-600 shadow-sm" />
                           </label>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                           <label className="input-label">Full Vector Address</label>
                           <input className="input w-full" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} />
                        </div>
                        <div>
                           <label className="input-label">Zone Mapping</label>
                           <select required className="input w-full" value={vendorForm.zoneId} onChange={e => setVendorForm({ ...vendorForm, zoneId: e.target.value })}>
                              <option value="">Select Target Zone...</option>
                              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="input-label">Sector Name</label>
                           <input className="input w-full" value={vendorForm.location} onChange={e => setVendorForm({ ...vendorForm, location: e.target.value })} />
                        </div>
                     </div>
                  </div>
               </div>
            </form>
            <div className="modal-footer">
               <button onClick={() => setShowVendorModal(false)} className="btn-ghost">Decline Update</button>
               <button type="submit" onClick={handleVendorSubmit} className="btn-primary min-w-[200px]">
                  Authorize Transmission
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Resource Modal Redesign */}
      {showVendorProductModal && selectedVendor && (
        <div className="modal-overlay">
          <div className="modal-box !max-w-xl">
             <div className="modal-header">
                <div>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Inventory Injection</span>
                   <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mt-2 leading-none">Map Payload Resource</h2>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-3">Node ID: {selectedVendor.name}</p>
                </div>
                <button onClick={() => setShowVendorProductModal(false)} className="btn-ghost btn-icon !rounded-full"><X size={20} /></button>
             </div>
             <form onSubmit={handleVendorProductSubmit} className="modal-body space-y-8">
                <div className="space-y-6">
                   <div>
                      <label className="input-label">Global Resource Profile *</label>
                      <select required className="input w-full" value={vpForm.productId} onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        setVpForm({ ...vpForm, productId: e.target.value, price: prod ? prod.price.toString() : '' });
                      }}>
                        <option value="">Select Resource Type...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Ref: RS. {p.price})</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <div>
                         <label className="input-label text-slate-900">Unit Price (RS)</label>
                         <input required type="number" step="any" className="input w-full border-white" value={vpForm.price} onChange={e => setVpForm({ ...vpForm, price: e.target.value })} />
                      </div>
                      <div>
                         <label className="input-label text-slate-900">Stash Limit</label>
                         <input required type="number" className="input w-full border-white" value={vpForm.stockQty} onChange={e => setVpForm({ ...vpForm, stockQty: e.target.value })} />
                      </div>
                   </div>
                </div>
             </form>
             <div className="modal-footer">
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full !h-16">
                   {isSubmitting ? 'Transmitting...' : 'Finalize Mapping Protocol'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
