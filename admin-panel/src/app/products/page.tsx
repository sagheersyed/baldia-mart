'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCcw, Package, Filter, MoreHorizontal, Pencil } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  section?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  stockQuantity: number;
  imageUrl: string;
  categoryId: string;
  brandId?: string;
  category: {
    name: string;
    section?: string;
  };
  brand?: {
    name: string;
  };
  isActive: boolean;
  maxQuantityPerOrder: number;
}

interface Brand {
  id: string;
  name: string;
}

const API_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/products';
const CAT_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/categories';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    discount: 0,
    stockQuantity: 0,
    categoryId: '',
    brandId: '',
    imageUrl: '',
    maxQuantityPerOrder: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        fetchWithAuth(API_URL),
        fetchWithAuth(CAT_URL),
        fetchWithAuth('https://c2e9-175-107-236-228.ngrok-free.app/api/v1/brands')
      ]);
      const [prodData, catData, brandData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        brandRes.json()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setBrands(brandData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingProduct ? `${API_URL}/${editingProduct.id}` : API_URL;
      const method = editingProduct ? 'PUT' : 'POST';

      const body = {
        ...formData,
        brandId: formData.brandId === '' ? null : formData.brandId,
        categoryId: formData.categoryId === '' ? null : formData.categoryId,
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingProduct(null);
        setFormData({ name: '', description: '', price: 0, discount: 0, stockQuantity: 0, categoryId: '', brandId: '', imageUrl: '', maxQuantityPerOrder: 0 });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      discount: Number(product.discount) || 0,
      stockQuantity: product.stockQuantity,
      categoryId: product.categoryId,
      brandId: product.brandId || '',
      imageUrl: product.imageUrl || '',
      maxQuantityPerOrder: product.maxQuantityPerOrder || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this product? It will no longer be visible to customers.')) return;
    try {
      await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to archive product:', error);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl shadow-orange-500/5">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Inventory</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Manage stock and pricing for your products</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchData}
            className="p-3 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 border border-gray-100 transition-all active:scale-95 flex items-center shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', description: '', price: 0, discount: 0, stockQuantity: 0, categoryId: '', brandId: '', imageUrl: '', maxQuantityPerOrder: 0 });
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-gradient-to-br from-primary to-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 shadow-md shadow-orange-500/10"
          >
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        </div>
      </header>

      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest font-black border-b border-gray-100">
                <th className="px-8 py-6">Product</th>
                <th className="py-6">Category</th>
                <th className="py-6 text-center">Base Price</th>
                <th className="py-6 text-center">Discount</th>
                <th className="py-6 text-center">Final Price</th>
                <th className="py-6 text-center">Stock</th>
                <th className="py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 hover:bg-gray-50/30">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-400 font-bold">Synchronizing inventory...</p>
                  </td>
                </tr>
              ) : products.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden border border-gray-50 shadow-sm group-hover:scale-105 transition-transform">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="text-gray-300" size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="block font-extrabold text-gray-800 text-lg">{prod.name}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-tight truncate max-w-[150px] text-ellipsis overflow-hidden whitespace-nowrap">{prod.description || 'No description'}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-black border border-gray-200">
                      {prod.category?.name || 'Uncategorized'} ({prod.category?.section || 'mart'})
                    </span>
                    {prod.brand?.name && (
                      <span className="ml-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black border border-blue-100">
                        {prod.brand.name}
                      </span>
                    )}
                  </td>
                  <td className="py-6 text-center font-black text-gray-400 line-through text-sm">Rs. {Number(prod.price || 0).toFixed(2)}</td>
                  <td className="py-6 text-center font-bold text-orange-500">- Rs. {Number(prod.discount || 0).toFixed(2)}</td>
                  <td className="py-6 text-center font-black text-gray-800 text-lg">
                    Rs. {(Number(prod.price || 0) - Number(prod.discount || 0)).toFixed(2)}
                  </td>
                  <td className="py-6 text-center">
                    <span className={`font-bold ${prod.stockQuantity < 10 ? 'text-red-500' : 'text-gray-600'}`}>
                      {prod.stockQuantity} units
                    </span>
                  </td>
                  <td className="py-6 text-center">
                    <div className="flex justify-center">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${prod.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {prod.isActive ? 'In Stock' : 'Archived'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && !loading && (
            <div className="py-20 text-center">
              <Package className="mx-auto text-gray-200 mb-4" size={50} />
              <h3 className="text-xl font-bold text-gray-400">Inventory is empty</h3>
              <p className="text-gray-400">Add products to see them here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-300">

            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">{editingProduct ? `Updating ${editingProduct.name}` : 'Register a new item in your inventory'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Product Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Fresh Red Tomatoes"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Category</label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm appearance-none"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name} ({cat.section || 'mart'})</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Filter size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Brand (Optional)</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm appearance-none"
                        value={formData.brandId}
                        onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      >
                        <option value="">Select a brand</option>
                        {brands.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Package size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Description</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tell customers more about this product..."
                    />
                  </div>

                  <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100 col-span-2 grid grid-cols-2 gap-4">
                    <div className="col-span-2 mb-1">
                      <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Pricing & Status</h3>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-orange-900/60 uppercase tracking-widest mb-1.5 px-1">Base Price (Rs.)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-orange-900 text-sm"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-orange-900/60 uppercase tracking-widest mb-1.5 px-1">Discount (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-orange-900 text-sm"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-span-2 flex justify-between items-center pt-2 px-1 border-t border-orange-100 mt-1">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Calculated Final Price:</span>
                      <span className="text-lg font-black text-orange-600">Rs. {(formData.price - formData.discount).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Stock Quantity</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Order Limit (0=No Limit)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm"
                      value={formData.maxQuantityPerOrder}
                      onChange={(e) => setFormData({ ...formData, maxQuantityPerOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center space-x-3 h-full pt-6">
                    <div className={`w-3 h-3 rounded-full ${formData.stockQuantity > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {formData.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Product Image URL</label>
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <input
                          type="url"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold text-sm"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="text-gray-200" size={20} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-[2.5rem]">
              <button
                type="submit"
                form="productForm"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'Syncing...' : (editingProduct ? 'Save Changes' : 'Add Product')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

