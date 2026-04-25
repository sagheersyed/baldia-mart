'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCw, Package, Filter, Pencil } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';

interface Category { id: string; name: string; section?: string }
interface Brand     { id: string; name: string }
interface Product {
  id: string; name: string; description: string; price: number; discount: number;
  stockQuantity: number; imageUrl: string; categoryId: string; brandId?: string;
  category: { name: string; section?: string }; brand?: { name: string };
  isActive: boolean; maxQuantityPerOrder: number; openingTime?: string; closingTime?: string;
}

const API_URL  = `${BASE_URL}/products`;
const CAT_URL  = `${BASE_URL}/categories`;

const EMPTY_FORM = { name: '', description: '', price: 0, discount: 0, stockQuantity: 0, categoryId: '', brandId: '', imageUrl: '', maxQuantityPerOrder: 0, openingTime: '', closingTime: '' };

export default function ProductsPage() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [categories,setCategories]= useState<Category[]>([]);
  const [brands,    setBrands]    = useState<Brand[]>([]);
  const { loading, error, execute } = useAsyncData();
  const [showModal,      setShowModal]      = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    await execute(async () => {
      const [pR, cR, bR] = await Promise.all([
        fetchWithAuth(API_URL),
        fetchWithAuth(CAT_URL),
        fetchWithAuth(`${BASE_URL}/brands`),
      ]);
      if (!pR.ok) throw new Error(await parseApiError(pR, 'Failed to load products'));
      if (!cR.ok) throw new Error(await parseApiError(cR, 'Failed to load categories'));
      if (!bR.ok) throw new Error(await parseApiError(bR, 'Failed to load brands'));
      const [p, c, b] = await Promise.all([pR.json(), cR.json(), bR.json()]);
      setProducts(p); setCategories(c); setBrands(b);
      return true;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url    = editingProduct ? `${API_URL}/${editingProduct.id}` : API_URL;
      const method = editingProduct ? 'PUT' : 'POST';
      const body   = { ...formData, brandId: formData.brandId || null, categoryId: formData.categoryId || null };
      const res    = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setShowModal(false);
        setEditingProduct(null);
        setFormData({ ...EMPTY_FORM });
        fetchData();
        showToast({ title: editingProduct ? 'Product updated' : 'Product created', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save product'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save product'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ name: p.name, description: p.description || '', price: Number(p.price), discount: Number(p.discount) || 0, stockQuantity: p.stockQuantity, categoryId: p.categoryId, brandId: p.brandId || '', imageUrl: p.imageUrl || '', maxQuantityPerOrder: p.maxQuantityPerOrder || 0, openingTime: p.openingTime || '', closingTime: p.closingTime || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this product? It will no longer be visible to customers.')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to archive product'));
      fetchData();
      showToast({ title: 'Product archived', variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to archive product'), variant: 'error' });
    }
  };

  const openAdd = () => { setEditingProduct(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage inventory, pricing and availability · {products.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {error && !loading ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category / Brand</th>
                  <th className="text-right">Base Price</th>
                  <th className="text-right">Discount</th>
                  <th className="text-right">Final Price</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <LoadingState message="Loading products…" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState title="No products yet" message="Add your first product to get started." icon={<Package size={22} className="text-slate-300" />} />
                    </td>
                  </tr>
                ) : products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                          {prod.imageUrl
                            ? <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-slate-300" /></div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate max-w-[180px]">{prod.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">{prod.description || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <span className="badge-gray">{prod.category?.name || 'Uncategorized'}</span>
                        {prod.brand?.name && <span className="badge-blue">{prod.brand.name}</span>}
                      </div>
                    </td>
                    <td className="text-right text-sm text-slate-400 line-through">Rs. {Number(prod.price || 0).toFixed(0)}</td>
                    <td className="text-right text-sm text-amber-600 font-medium">-{Number(prod.discount || 0).toFixed(0)}</td>
                    <td className="text-right font-bold text-slate-800">Rs. {(Number(prod.price || 0) - Number(prod.discount || 0)).toFixed(0)}</td>
                    <td className="text-center">
                      <span className={`text-sm font-semibold ${prod.stockQuantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                        {prod.stockQuantity}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={prod.isActive ? 'badge-green' : 'badge-gray'}>
                        {prod.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleEdit(prod)} className="btn-ghost btn-icon text-blue-600 border-blue-100 hover:bg-blue-50">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(prod.id)} className="btn-ghost btn-icon text-red-500 border-red-100 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editingProduct ? `Editing: ${editingProduct.name}` : 'Create a new inventory item'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="modal-body">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="input-label">Product Name</label>
                  <input required type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Fresh Red Tomatoes" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Category</label>
                    <select required className="input" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section || 'mart'})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Brand (optional)</label>
                    <select className="input" value={formData.brandId} onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}>
                      <option value="">No brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Description</label>
                  <textarea rows={2} className="input resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Product description…" />
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Base Price (Rs.)</label>
                      <input required type="number" step="0.01" className="input" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="input-label">Discount (Rs.)</label>
                      <input type="number" step="0.01" className="input" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold">Final Price</span>
                    <span className="font-bold text-emerald-700">Rs. {(formData.price - formData.discount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Stock Qty</label>
                    <input required type="number" className="input" value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="input-label">Order Limit (0=none)</label>
                    <input type="number" className="input" value={formData.maxQuantityPerOrder} onChange={(e) => setFormData({ ...formData, maxQuantityPerOrder: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Opening Time</label>
                    <input type="time" className="input" value={formData.openingTime} onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Closing Time</label>
                    <input type="time" className="input" value={formData.closingTime} onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="input-label">Image URL</label>
                  <div className="flex gap-3">
                    <input type="url" className="input flex-1" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://…" />
                    <div className="w-11 h-11 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                      {formData.imageUrl
                        ? <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        : <Package className="text-slate-200 m-auto mt-3" size={18} />}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="submit" form="productForm" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (editingProduct ? 'Save Changes' : 'Add Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
