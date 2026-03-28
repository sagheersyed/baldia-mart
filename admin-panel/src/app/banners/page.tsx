'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit2, CheckCircle, XCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface Banner {
  id: string;
  section: 'mart' | 'food' | 'all';
  title: string;
  subtitle: string;
  description: string;
  tagLabel: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  backgroundColor: string;
  textColor: string;
  linkType?: string;
  linkId?: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkEntities, setLinkEntities] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (isModalOpen && editingBanner?.linkType && editingBanner.linkType !== 'none') {
      fetchLinkEntities(editingBanner.linkType);
    } else {
      setLinkEntities([]);
    }
  }, [isModalOpen, editingBanner?.linkType]);

  const fetchLinkEntities = async (type: string) => {
    try {
      let endpoint = '';
      if (type === 'product') endpoint = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/products';
      else if (type === 'restaurant') endpoint = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/restaurants';
      else if (type === 'brand') endpoint = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/brands';
      else if (type === 'category') endpoint = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/categories';

      if (!endpoint) return;
      const res = await fetchWithAuth(endpoint);
      const data = await res.json();
      setLinkEntities(Array.isArray(data) ? data.map((item: any) => ({ id: item.id, name: item.name || item.title || item.id })) : []);
    } catch (error) {
      console.error('Failed to fetch link entities:', error);
    }
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://c2e9-175-107-236-228.ngrok-free.app/api/v1/banners');
      const data = await res.json();
      setBanners(data);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    try {
      setSaving(true);
      const url = editingBanner.id
        ? `https://c2e9-175-107-236-228.ngrok-free.app/api/v1/banners/${editingBanner.id}`
        : 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/banners';
      const method = editingBanner.id ? 'PATCH' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBanner),
      });

      if (!res.ok) throw new Error('Failed to save banner');

      setIsModalOpen(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetchWithAuth(`https://c2e9-175-107-236-228.ngrok-free.app/api/v1/banners/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchBanners();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete banner');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            <Layers className="mr-4 text-primary" size={40} />
            Promotional Banners
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage advertisements for Mart and Food sections.</p>
        </div>
        <button
          onClick={() => {
            setEditingBanner({
              section: 'mart',
              isActive: true,
              sortOrder: 1,
              backgroundColor: '#FF4500',
              textColor: '#FFFFFF',
              description: '',
              tagLabel: '',
              linkType: 'none',
              linkId: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-primary text-white p-4 rounded-2xl font-black flex items-center shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform"
        >
          <Plus size={20} className="mr-2" /> Add New Banner
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-primary" size={40} /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
              <div
                className="h-40 p-6 flex flex-col justify-center relative"
                style={{ backgroundColor: banner.backgroundColor }}
              >
                <div className="absolute top-4 right-4">
                  {banner.isActive ? <CheckCircle className="text-white opacity-80" /> : <XCircle className="text-white opacity-40" />}
                </div>
                {banner.tagLabel && (
                  <span className="absolute top-4 left-4 inline-block px-2 py-1 rounded-md text-[8px] font-black uppercase bg-white/20 text-white">
                    {banner.tagLabel}
                  </span>
                )}
                <h3 className="text-xl font-black mb-1" style={{ color: banner.textColor }}>{banner.title}</h3>
                <p className="text-sm font-bold opacity-90" style={{ color: banner.textColor }}>{banner.subtitle}</p>
                <span className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white w-fit">
                  {banner.section}
                </span>
              </div>
              <div className="p-4 flex justify-between items-center bg-gray-50">
                <span className="text-xs font-black text-gray-400">Order: {banner.sortOrder}</span>
                <div className="flex space-x-2">
                  <button onClick={() => { setEditingBanner(banner); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">{editingBanner?.id ? 'Edit Banner' : 'New Banner'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Section</label>
                  <select
                    value={editingBanner?.section}
                    onChange={e => setEditingBanner({ ...editingBanner!, section: e.target.value as any })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value="mart">Mart</option>
                    <option value="food">Food</option>
                    <option value="all">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={editingBanner?.sortOrder}
                    onChange={e => setEditingBanner({ ...editingBanner!, sortOrder: parseInt(e.target.value) })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingBanner?.title}
                  onChange={e => setEditingBanner({ ...editingBanner!, title: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingBanner?.subtitle}
                  onChange={e => setEditingBanner({ ...editingBanner!, subtitle: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Description</label>
                <textarea
                  value={editingBanner?.description}
                  onChange={e => setEditingBanner({ ...editingBanner!, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border rounded-xl font-bold h-24"
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Tag Label</label>
                  <input
                    type="text"
                    value={editingBanner?.tagLabel}
                    onChange={e => setEditingBanner({ ...editingBanner!, tagLabel: e.target.value })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                    placeholder="e.g. FLASH SALE"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Quick Presets</label>
                  <select
                    onChange={e => {
                      if (e.target.value) setEditingBanner({ ...editingBanner!, imageUrl: e.target.value });
                    }}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                  >
                    <option value="">-- Select Preset --</option>
                    <option value="https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80">Biryani 🍛</option>
                    <option value="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80">BBQ Platter 🥩</option>
                    <option value="https://images.unsplash.com/photo-1626700051175-6818013e184f?auto=format&fit=crop&w=800&q=80">Roll / Wrap 🌯</option>
                    <option value="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80">Burger 🍔</option>
                    <option value="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80">Pizza 🍕</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Image URL</label>
                  <input
                    type="text"
                    value={editingBanner?.imageUrl}
                    onChange={e => setEditingBanner({ ...editingBanner!, imageUrl: e.target.value })}
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Link Destination</label>
                  <div className="flex gap-2">
                    <select
                      value={editingBanner?.linkType || 'none'}
                      onChange={e => setEditingBanner({ ...editingBanner!, linkType: e.target.value, linkId: '' })}
                      className="p-3 bg-gray-50 border rounded-xl font-bold text-sm w-1/2"
                    >
                      <option value="none">None</option>
                      <option value="product">Product</option>
                      <option value="brand">Brand</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="category">Category</option>
                    </select>
                    {editingBanner?.linkType && editingBanner.linkType !== 'none' ? (
                      <select
                        value={editingBanner?.linkId || ''}
                        onChange={e => setEditingBanner({ ...editingBanner!, linkId: e.target.value })}
                        className="w-1/2 p-3 bg-gray-50 border rounded-xl font-bold text-sm"
                      >
                        <option value="">-- Select --</option>
                        {linkEntities.map(entity => (
                          <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        placeholder="N/A"
                        className="w-1/2 p-3 bg-gray-100 border rounded-xl font-bold"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">BG Color</label>
                  <input
                    type="color"
                    value={editingBanner?.backgroundColor}
                    onChange={e => setEditingBanner({ ...editingBanner!, backgroundColor: e.target.value })}
                    className="w-full h-12 p-1 bg-gray-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Text Color</label>
                  <input
                    type="color"
                    value={editingBanner?.textColor}
                    onChange={e => setEditingBanner({ ...editingBanner!, textColor: e.target.value })}
                    className="w-full h-12 p-1 bg-gray-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  checked={editingBanner?.isActive}
                  onChange={e => setEditingBanner({ ...editingBanner!, isActive: e.target.checked })}
                  className="w-5 h-5 accent-primary"
                />
                <label className="text-sm font-black text-gray-700">Active</label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg mt-4 shadow-xl shadow-orange-500/20"
              >
                {saving ? <RefreshCw className="animate-spin mx-auto" /> : 'Save Banner'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
