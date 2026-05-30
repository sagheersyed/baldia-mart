'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, RefreshCw, Package, Pencil, FolderTree } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';

interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  iconUrl?: string | null;
  isActive: boolean;
  section: string;
  openingTime?: string;
  closingTime?: string;
  parentCategoryId?: string | null;
  sortOrder?: number;
}

const API_URL = `${BASE_URL}/categories`;

const EMPTY_FORM = {
  name: '', description: '', imageUrl: '', iconUrl: '',
  section: 'mart', openingTime: '', closingTime: '',
  parentCategoryId: '', sortOrder: 0,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { loading, error, execute } = useAsyncData();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'mart' | 'pharma' | 'restaurant'>('mart');

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    await execute(async () => {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load categories'));
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      // Stable order: sortOrder ASC, then name
      list.sort((a: Category, b: Category) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      );
      setCategories(list);
      return true;
    });
  };

  const parentMap = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach(c => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.section === activeTab);
  }, [categories, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingCategory ? `${API_URL}/${editingCategory.id}` : API_URL;
      const method = editingCategory ? 'PUT' : 'POST';
      const body: any = {
        ...formData,
        iconUrl: formData.iconUrl || null,
        parentCategoryId: formData.parentCategoryId || null,
        sortOrder: Number(formData.sortOrder) || 0,
      };
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ ...EMPTY_FORM });
        fetchCategories();
        showToast({ title: editingCategory ? 'Category updated' : 'Category created', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save category'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save category'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      iconUrl: category.iconUrl || '',
      section: category.section || 'mart',
      openingTime: category.openingTime || '',
      closingTime: category.closingTime || '',
      parentCategoryId: category.parentCategoryId || '',
      sortOrder: category.sortOrder || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this category? It will no longer be visible to customers, but existing products will remain.')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to archive category'));
      fetchCategories();
      showToast({ title: 'Category archived', variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to archive category'), variant: 'error' });
    }
  };

  const openAdd = () => {
    setEditingCategory(null);
    setFormData({ ...EMPTY_FORM, section: activeTab });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Curate marketplace structure · {categories.length} categories</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCategories} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> New Category
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('mart')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'mart' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Quick Mart (Grocery)
        </button>
        <button 
          onClick={() => setActiveTab('pharma')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pharma' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pharma (Medicines)
        </button>
        <button 
          onClick={() => setActiveTab('restaurant')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'restaurant' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Restaurant (Food)
        </button>
      </div>

      <div className="card overflow-hidden">
        {error && !loading ? (
          <ErrorState message={error} onRetry={fetchCategories} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Section</th>
                  <th>Parent</th>
                  <th className="text-center">Sort</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadingState message="Loading categories…" />
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No categories yet"
                        message={`Add your first category to start organizing ${activeTab === 'pharma' ? 'medicines' : activeTab === 'restaurant' ? 'dishes' : 'grocery inventory'}.`}
                        icon={<FolderTree size={22} className="text-slate-300" />}
                      />
                    </td>
                  </tr>
                ) : filteredCategories.map((cat) => {
                  const parent = cat.parentCategoryId ? parentMap.get(cat.parentCategoryId) : null;
                  return (
                    <tr key={cat.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                            {cat.iconUrl || cat.imageUrl
                              ? <img src={cat.iconUrl || cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-slate-300" /></div>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]">{cat.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{cat.description || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={
                          cat.section === 'restaurant' ? 'badge-blue' : 
                          cat.section === 'pharma' ? 'badge-purple' : 'badge-green'
                        }>
                          {cat.section === 'restaurant' ? 'Food' : 
                           cat.section === 'pharma' ? 'Pharma' : 'Mart'}
                        </span>
                      </td>
                      <td>
                        {parent
                          ? <span className="badge-gray">{parent.name}</span>
                          : <span className="text-xs text-slate-400">— top level —</span>}
                      </td>
                      <td className="text-center text-sm font-semibold text-slate-700">{cat.sortOrder ?? 0}</td>
                      <td className="text-center">
                        <span className={cat.isActive ? 'badge-green' : 'badge-gray'}>
                          {cat.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleEdit(cat)} className="btn-ghost btn-icon text-blue-600 border-blue-100 hover:bg-blue-50">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="btn-ghost btn-icon text-red-500 border-red-100 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <h2 className="font-bold text-slate-800 text-lg">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingCategory ? `Updating ${editingCategory.name}` : 'Add a fresh category to your store'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="modal-body">
              <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="input-label">Category Name</label>
                  <input required type="text" className="input" placeholder="e.g. Beverages"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Description</label>
                  <textarea rows={2} className="input resize-none" placeholder="Brief description…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Section</label>
                    <select className="input" value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}>
                      <option value="mart">Quick Mart (Grocery)</option>
                      <option value="restaurant">Restaurant (Food)</option>
                      <option value="pharma">Pharma (Medicine)</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Sort Order</label>
                    <input type="number" className="input" value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Parent Category (optional)</label>
                  <select className="input" value={formData.parentCategoryId}
                    onChange={(e) => setFormData({ ...formData, parentCategoryId: e.target.value })}>
                    <option value="">— Top level (no parent) —</option>
                    {categories
                      .filter(c => !editingCategory || c.id !== editingCategory.id)
                      .filter(c => c.section === formData.section)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5">Set a parent to nest this category as a subcategory.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Image URL</label>
                    <input type="url" className="input" placeholder="https://…"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Icon URL</label>
                    <input type="url" className="input" placeholder="https://…"
                      value={formData.iconUrl}
                      onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Opening Time</label>
                    <input type="time" className="input" value={formData.openingTime}
                      onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Closing Time</label>
                    <input type="time" className="input" value={formData.closingTime}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })} />
                  </div>
                  <p className="col-span-2 text-[10px] text-slate-400 italic">
                    Leave blank to use parent brand/vendor hours. These override brand hours but are overridden by product hours.
                  </p>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="submit" form="categoryForm" disabled={isSubmitting}
                className="btn-primary w-full justify-center py-3">
                {isSubmitting
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : (editingCategory ? 'Save Changes' : 'Create Category')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
