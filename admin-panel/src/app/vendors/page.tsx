'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Pencil, MapPin, Store, CheckCircle, XCircle, Package } from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

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
  name: '', type: 'grocery', address: '', location: '', lat: '', lng: '', isOpen: true, isActive: true, openingHours: '09:00 AM - 11:00 PM', zoneId: ''
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

  useEffect(() => {
    fetchVendors();
    fetchProducts();
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/delivery-zones/all`);
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth(PRODUCTS_API);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingVendor ? `${API_URL}/${editingVendor.id}` : API_URL;
      const method = editingVendor ? 'PATCH' : 'POST';
      const payload = {
        ...vendorForm,
        lat: vendorForm.lat ? parseFloat(vendorForm.lat) : null,
        lng: vendorForm.lng ? parseFloat(vendorForm.lng) : null,
        zoneId: vendorForm.zoneId || null
      };
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowVendorModal(false);
        setEditingVendor(null);
        setVendorForm(emptyVendorForm);
        fetchVendors();
      }
    } catch (err) {
      console.error('Failed to save vendor:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVendorProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !vpForm.productId) return;
    setIsSubmitting(true);
    try {
      const url = `${API_URL}/${selectedVendor.id}/products`;
      const payload = {
        productId: vpForm.productId,
        price: parseFloat(vpForm.price),
        stockQty: parseInt(vpForm.stockQty),
        isAvailable: vpForm.isAvailable
      };
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowVendorProductModal(false);
        setVpForm(emptyVendorProductForm);
        fetchVendors();
      }
    } catch (err) {
      console.error('Failed to save vendor product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVendorProduct = async (vendorId: string, vpId: string) => {
    if (!confirm('Remove this product from the vendor?')) return;
    await fetchWithAuth(`${API_URL}/${vendorId}/products/${vpId}`, { method: 'DELETE' });
    fetchVendors();
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Delete this vendor?')) return;
    await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
    fetchVendors();
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name, type: v.type || 'grocery', address: v.address || '',
      location: v.location || '',
      lat: v.lat ? v.lat.toString() : '', lng: v.lng ? v.lng.toString() : '',
      isOpen: v.isOpen, isActive: v.isActive,
      openingHours: v.openingHours || '09:00 AM - 11:00 PM',
      zoneId: v.zoneId || ''
    });
    setShowVendorModal(true);
  };

  const filteredVendors = selectedZoneFilter === 'all' 
    ? vendors 
    : vendors.filter(v => v.zoneId === selectedZoneFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900">🏪 Vendors</h1>
            <p className="text-gray-400 font-medium mt-1">Manage local vendors and item stock mapping for Mart mode</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              className="bg-white border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
            >
              <option value="all">All Delivery Zones</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setEditingVendor(null); setVendorForm(emptyVendorForm); setShowVendorModal(true); }}
              className="flex items-center space-x-2 bg-gradient-to-br from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center overflow-hidden">
                      <Store size={28} className="text-teal-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{vendor.name} <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg ml-2">{vendor.type}</span></h2>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {vendor.address && (
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                            <MapPin size={10} /> {vendor.address}
                          </span>
                        )}
                        {vendor.location && (
                          <span className="flex items-center gap-1 text-xs font-bold text-teal-500 bg-teal-50 px-2 py-1 rounded-full">
                            📍 {vendor.location}
                          </span>
                        )}
                        {vendor.openingHours && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                             🕒 {vendor.openingHours}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${vendor.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {vendor.isOpen ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {vendor.isOpen ? 'Currently Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedVendor(vendor); setVpForm(emptyVendorProductForm); setShowVendorProductModal(true); }}
                      className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      <Plus size={14} /> Map Product
                    </button>
                    <button onClick={() => openEditVendor(vendor)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteVendor(vendor.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {vendor.vendorProducts && vendor.vendorProducts.length > 0 ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendor.vendorProducts.map(vp => (
                      <div key={vp.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-teal-500">
                          <Package size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{vp.product?.name || 'Unknown Product'}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm font-black text-teal-600">Rs {vp.price}</p>
                            <p className="text-xs font-semibold text-gray-400">Stock: {vp.stockQty}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteVendorProduct(vendor.id, vp.id)} className="p-2 text-red-400 hover:text-red-600 bg-white rounded-lg border border-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">No products mapped to this vendor yet.</div>
                )}
              </div>
            ))}
            {vendors.length === 0 && !loading && (
              <div className="text-center py-20">
                <Store className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-400">No vendors registered</h3>
                <p className="text-gray-300 mt-2">Add your first local vendor to enable smart splitting.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showVendorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-7 border-b border-gray-100">
              <h2 className="text-2xl font-black">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={() => setShowVendorModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleVendorSubmit} className="p-7 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Vendor Name *</label>
                <input required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Store Type</label>
                  <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vendorForm.type} onChange={e => setVendorForm({ ...vendorForm, type: e.target.value })}>
                    <option value="grocery">Grocery Store</option>
                    <option value="dairy">Dairy Shop</option>
                    <option value="vegetable">Vegetable Market</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="butcher">Meat & Poultry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Zone</label>
                  <select required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vendorForm.zoneId} onChange={e => setVendorForm({ ...vendorForm, zoneId: e.target.value })}>
                    <option value="">Select a zone...</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center mt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={vendorForm.isOpen} onChange={e => setVendorForm({ ...vendorForm, isOpen: e.target.checked })} className="w-5 h-5 accent-teal-500" />
                    <span className="font-bold text-gray-700">Currently Open</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location/Area Name</label>
                <input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" value={vendorForm.location} onChange={e => setVendorForm({ ...vendorForm, location: e.target.value })} placeholder="e.g. Colony No 1, Baldia Town" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Street Address</label>
                <input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} placeholder="Street 5, Block B, House 12..." />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Opening Hours (Example: 09:00 AM - 11:00 PM)</label>
                <input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" value={vendorForm.openingHours} onChange={e => setVendorForm({ ...vendorForm, openingHours: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Latitude</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vendorForm.lat} onChange={e => setVendorForm({ ...vendorForm, lat: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Longitude</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vendorForm.lng} onChange={e => setVendorForm({ ...vendorForm, lng: e.target.value })} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVendorProductModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-7 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-black">Map Product</h2>
                <p className="text-sm text-gray-400 mt-1">To: {selectedVendor.name}</p>
              </div>
              <button onClick={() => setShowVendorProductModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleVendorProductSubmit} className="p-7 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Global Product *</label>
                <select required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vpForm.productId} onChange={e => {
                  const prod = products.find(p => p.id === e.target.value);
                  setVpForm({ ...vpForm, productId: e.target.value, price: prod ? prod.price.toString() : '' });
                }}>
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Base Rs {p.price})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Vendor Price (Rs) *</label>
                  <input required type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vpForm.price} onChange={e => setVpForm({ ...vpForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Stock Quantity</label>
                  <input required type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={vpForm.stockQty} onChange={e => setVpForm({ ...vpForm, stockQty: e.target.value })} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : 'Map Product to Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
