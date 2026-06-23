'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCw, Package, Pencil, Star, Zap, Flame, Search } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

interface Category { id: string; name: string; section?: string }
interface Brand { id: string; name: string }
interface Product {
  id: string; name: string; description: string; price: number; discount: number;
  stockQuantity: number; imageUrl: string; categoryId: string; brandId?: string;
  category: { name: string; section?: string }; brand?: { name: string };
  isActive: boolean; maxQuantityPerOrder: number; openingTime?: string; closingTime?: string;
  isFeatured?: boolean; isBestSeller?: boolean; isDeal?: boolean;
  discountPercent?: number | null; unit?: string | null; weight?: string | null;
  tags?: string[] | null; sortOrder?: number;
}

const API_URL = `${BASE_URL}/products`;
const CAT_URL = `${BASE_URL}/categories`;

const EMPTY_FORM = {
  name: '', description: '', price: 0, discount: 0, stockQuantity: 0,
  categoryId: '', brandId: '', imageUrl: '', maxQuantityPerOrder: 0,
  openingTime: '', closingTime: '',
  isFeatured: false, isBestSeller: false, isDeal: false,
  discountPercent: '' as string | number,
  unit: '', weight: '', tags: '',
  sortOrder: 0,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const { loading, error, execute } = useAsyncData();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchData(1, ''); }, []);

  const fetchData = async (targetPage = page, query = searchQuery) => {
    await execute(async () => {
      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', '20');
      if (query.trim()) {
        params.append('search', query.trim());
      }
      const [pR, cR, bR] = await Promise.all([
        fetchWithAuth(`${API_URL}?${params.toString()}`),
        fetchWithAuth(CAT_URL),
        fetchWithAuth(`${BASE_URL}/brands`),
      ]);
      if (!pR.ok) throw new Error(await parseApiError(pR, 'Failed to load products'));
      if (!cR.ok) throw new Error(await parseApiError(cR, 'Failed to load categories'));
      if (!bR.ok) throw new Error(await parseApiError(bR, 'Failed to load brands'));
      const [pRaw, c, b] = await Promise.all([pR.json(), cR.json(), bR.json()]);

      const p = Array.isArray(pRaw) ? pRaw : (pRaw?.data || []);
      setProducts(p);
      setTotalPages(pRaw?.totalPages || 1);
      setTotalItems(pRaw?.total || 0);
      setPage(targetPage);

      setCategories(Array.isArray(c) ? c : (c?.data || []));
      setBrands(Array.isArray(b) ? b : (b?.data || []));
      return true;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingProduct ? `${API_URL}/${editingProduct.id}` : API_URL;
      const method = editingProduct ? 'PUT' : 'POST';
      const tagsArr = String(formData.tags || '')
        .split(',').map(t => t.trim()).filter(Boolean);
      const body: any = {
        ...formData,
        brandId: formData.brandId || null,
        categoryId: formData.categoryId || null,
        discountPercent: formData.discountPercent === '' ? null : Number(formData.discountPercent),
        unit: formData.unit || null,
        weight: formData.weight || null,
        tags: tagsArr.length ? tagsArr : null,
        sortOrder: Number(formData.sortOrder) || 0,
      };
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    setFormData({
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      discount: Number(p.discount) || 0,
      stockQuantity: p.stockQuantity,
      categoryId: p.categoryId,
      brandId: p.brandId || '',
      imageUrl: p.imageUrl || '',
      maxQuantityPerOrder: p.maxQuantityPerOrder || 0,
      openingTime: p.openingTime || '',
      closingTime: p.closingTime || '',
      isFeatured: !!p.isFeatured,
      isBestSeller: !!p.isBestSeller,
      isDeal: !!p.isDeal,
      discountPercent: p.discountPercent ?? '',
      unit: p.unit || '',
      weight: p.weight || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      sortOrder: p.sortOrder || 0,
    });
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

  // Quick toggle for merchandising flags via dedicated admin endpoint.
  const toggleFlag = async (
    p: Product,
    flag: 'isFeatured' | 'isBestSeller' | 'isDeal',
  ) => {
    const next = !p[flag];
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, [flag]: next } : x));
    try {
      const res = await fetchWithAuth(`${API_URL}/${p.id}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: next }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update flag'));
      showToast({ title: `${flagLabel(flag)} ${next ? 'enabled' : 'disabled'}`, variant: 'success' });
    } catch (err) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, [flag]: !next } : x));
      showToast({ title: getErrorMessage(err, 'Failed to update flag'), variant: 'error' });
    }
  };

  const openAdd = () => { setEditingProduct(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage inventory, pricing and merchandising across all verticals.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search catalog..."
              className="input pl-10 w-64"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchData(1, e.target.value);
              }}
            />
          </div>
          <button onClick={() => fetchData(1)} className="btn-ghost btn-icon">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="btn-accent">
            <Plus size={18} /> New Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && products.length === 0 ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="card h-96 animate-pulse bg-slate-50" />
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center card bg-white border-dashed">
            <Package size={48} className="text-slate-200 mb-4" />
            <p className="text-sm font-semibold text-slate-400">No products match your search</p>
          </div>
        ) : products.map((prod) => (
          <div key={prod.id} className="card flex flex-col">
            {/* Image Section */}
            <div className="relative aspect-square overflow-hidden bg-slate-50 border-b border-slate-100 shrink-0">
              {prod.imageUrl ? (
                <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200">
                  <Package size={48} />
                </div>
              )}
              
              {/* Status Overlay */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
                {prod.isFeatured && <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Featured</span>}
                {prod.isBestSeller && <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Hot</span>}
              </div>

              <div className="absolute bottom-3 right-3">
                <span className={prod.isActive ? 'badge-blue' : 'badge-gray'}>
                  {prod.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex-1 mb-6">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">
                  {prod.category?.name || 'Uncategorized'}
                </span>
                <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 mb-1.5">{prod.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{prod.description || 'No description provided.'}</p>
              </div>

              <div className="flex items-center justify-between mb-6 pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory</span>
                  <span className={`text-sm font-bold ${prod.stockQuantity < 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {prod.stockQuantity} <span className="text-slate-400 font-medium">in stock</span>
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-bold text-slate-900">
                    Rs. {(Number(prod.price || 0) - Number(prod.discount || 0)).toFixed(0)}
                  </span>
                  {Number(prod.discount) > 0 && (
                    <span className="text-xs text-slate-400 line-through font-medium">Rs. {Number(prod.price).toFixed(0)}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(prod)} className="flex-1 btn-ghost !rounded-xl !py-2.5">
                  <Pencil size={15} /> Edit
                </button>
                <button onClick={() => handleDelete(prod.id)} className="w-11 btn-ghost !text-rose-500 hover:!bg-rose-50 hover:!border-rose-100 !rounded-xl">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>


      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{products.length}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> items
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={fetchData} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="input-label">Base Price (Rs.)</label>
                      <input required type="number" step="0.01" className="input" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="input-label">Discount (Rs.)</label>
                      <input type="number" step="0.01" className="input" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="input-label">Discount %</label>
                      <input type="number" min={0} max={100} className="input" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} placeholder="auto" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold">Final Price</span>
                    <span className="font-bold text-emerald-700">Rs. {(Number(formData.price) - Number(formData.discount)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory & Packaging</p>
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
                      <label className="input-label">Unit</label>
                      <select className="input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                        <option value="">— none —</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="pcs">pcs</option>
                        <option value="dozen">dozen</option>
                        <option value="pack">pack</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Weight / Pack Size</label>
                      <input type="text" className="input" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g. 500g, 1kg, 12 pcs" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Merchandising</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FlagSwitch
                      label="Featured"
                      icon={<Star size={14} />}
                      checked={formData.isFeatured}
                      onChange={(v) => setFormData({ ...formData, isFeatured: v })}
                    />
                    <FlagSwitch
                      label="Best Seller"
                      icon={<Flame size={14} />}
                      checked={formData.isBestSeller}
                      onChange={(v) => setFormData({ ...formData, isBestSeller: v })}
                    />
                    <FlagSwitch
                      label="Deal"
                      icon={<Zap size={14} />}
                      checked={formData.isDeal}
                      onChange={(v) => setFormData({ ...formData, isDeal: v })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Sort Order</label>
                      <input type="number" className="input" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="input-label">Tags (comma separated)</label>
                      <input type="text" className="input" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g. organic, fresh, daily" />
                    </div>
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

// ── Helpers ──
function flagLabel(f: 'isFeatured' | 'isBestSeller' | 'isDeal') {
  return f === 'isFeatured' ? 'Featured' : f === 'isBestSeller' ? 'Best Seller' : 'Deal';
}

function FlagToggle({
  icon, active, title, onClick, activeClass,
}: {
  icon: React.ReactNode;
  active: boolean;
  title: string;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        'inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all ' +
        (active
          ? activeClass
          : 'bg-white border-slate-200 text-slate-300 hover:text-slate-500 hover:border-slate-300')
      }
    >
      {icon}
    </button>
  );
}

function FlagSwitch({
  label, icon, checked, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all ' +
        (checked
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')
      }
    >
      <span className="flex items-center gap-2 text-xs font-semibold">
        {icon}
        {label}
      </span>
      <span
        className={
          'inline-block w-8 h-4 rounded-full relative transition-all ' +
          (checked ? 'bg-emerald-500' : 'bg-slate-200')
        }
      >
        <span
          className={
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ' +
            (checked ? 'left-4' : 'left-0.5')
          }
        />
      </span>
    </button>
  );
}
