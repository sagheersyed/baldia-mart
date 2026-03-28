'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCcw, Building2, Pencil } from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  isActive: boolean;
  section: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}

const API_URL = `${BASE_URL}/brands`;

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', description: '', logoUrl: '', section: 'mart', 
    location: '', latitude: '', longitude: '', category: '',
    isActive: true 
  });
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      const data = await res.json();
      setBrands(data);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingBrand ? `${API_URL}/${editingBrand.id}` : API_URL;
      const method = editingBrand ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingBrand(null);
        setFormData({ name: '', description: '', logoUrl: '', section: 'mart', location: '', latitude: '', longitude: '', category: '', isActive: true });
        fetchBrands();
      }
    } catch (error) {
      console.error('Failed to save brand:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logoUrl: brand.logoUrl || '',
      section: brand.section || 'mart',
      location: brand.location || '',
      latitude: brand.latitude ? brand.latitude.toString() : '',
      longitude: brand.longitude ? brand.longitude.toString() : '',
      category: brand.category || '',
      isActive: brand.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand? Products associated with it will lose their brand association.')) return;
    try {
      await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchBrands();
    } catch (error) {
      console.error('Failed to delete brand:', error);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl shadow-blue-500/5">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Brands</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Manage partner companies and manufacturers</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchBrands}
            className="p-3 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 border border-gray-100 transition-all active:scale-95 flex items-center shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => {
              setEditingBrand(null);
              setFormData({ name: '', description: '', logoUrl: '', section: 'mart', location: '', latitude: '', longitude: '', category: '', isActive: true });
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 shadow-md shadow-blue-500/10"
          >
            <Plus size={20} />
            <span>Add Brand</span>
          </button>
        </div>
      </header>

      {loading && brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Fetching brands...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {brands.map((brand) => (
            <div 
              key={brand.id} 
              className="group relative bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-2"
            >
               <div className="relative h-32 w-full bg-gray-50 rounded-[2rem] mb-5 overflow-hidden border border-gray-50 flex items-center justify-center p-6">
                 {brand.logoUrl ? (
                   <img src={brand.logoUrl} alt={brand.name} className="max-w-full max-h-full object-contain" />
                 ) : (
                   <Building2 className="text-gray-200" size={48} />
                 )}
                 <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => handleEdit(brand)}
                    className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                   >
                     <Pencil size={16} />
                   </button>
                   <button 
                    onClick={() => handleDelete(brand.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
               <div className="text-center px-1">
                 <h3 className="font-extrabold text-xl text-gray-800 mb-1">{brand.name}</h3>
                 <p className="text-xs text-gray-400 line-clamp-2 font-medium">{brand.description || (brand.section === 'restaurant' ? 'Restaurant Partner' : 'Retail Partner')}</p>
                 <div className="mt-4 flex flex-wrap gap-2 justify-center">
                   <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                     {brand.isActive ? 'Active' : 'Inactive'}
                   </span>
                   <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                     {brand.section}
                   </span>
                   {brand.category && (
                     <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                       {brand.category}
                     </span>
                   )}
                 </div>
               </div>
            </div>
          ))}

          {brands.length === 0 && !loading && (
            <div className="col-span-full py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
               <Building2 className="text-gray-200 mb-4" size={50} />
               <h3 className="text-xl font-bold text-gray-400">No brands partner found</h3>
               <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 font-bold hover:underline">Add First Brand</button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <h2 className="text-2xl font-black text-gray-800 mb-6">{editingBrand ? 'Edit Brand' : 'New Brand'}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Brand Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Logo URL</label>
                  <input
                    type="url"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    rows={2}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Section Type</label>
                    <select
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    >
                      <option value="mart">Retail Mart</option>
                      <option value="restaurant">Food & Restaurant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Beverages, Snacks..."
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location String</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all font-bold"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-500 focus:ring-blue-500" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer">Brand is Active (Visible to Customers)</label>
                </div>

                <div className="pt-2">
                  <button
                    disabled={isSubmitting}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : (editingBrand ? 'Save Changes' : 'Create Brand')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
