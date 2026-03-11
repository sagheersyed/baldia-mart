'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCcw, Package } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

const API_URL = 'http://localhost:3000/api/v1/categories';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '', imageUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      });
      if (res.ok) {
        setShowModal(false);
        setNewCat({ name: '', description: '', imageUrl: '' });
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl shadow-orange-500/5">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Categories</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Curate your marketplace inventory</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchCategories}
            className="p-3 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 border border-gray-100 transition-all active:scale-95 flex items-center shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-br from-primary to-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 shadow-md shadow-orange-500/10"
          >
            <Plus size={20} />
            <span>New Category</span>
          </button>
        </div>
      </header>

      {loading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Fetching categories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="group relative bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 transform hover:-translate-y-2 cursor-default overflow-hidden"
            >
               <div className="relative h-48 w-full bg-gray-50 rounded-[2rem] mb-5 overflow-hidden border border-gray-50">
                 {cat.imageUrl ? (
                   <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <Package className="text-gray-200" size={48} />
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <button 
                  onClick={() => handleDelete(cat.id)}
                  className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
               <div className="px-1">
                 <h3 className="font-extrabold text-xl text-gray-800 mb-1 group-hover:text-primary transition-colors">{cat.name}</h3>
                 <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] font-medium leading-relaxed">{cat.description || 'No description provided.'}</p>
                 <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 uppercase tracking-wider">Active</span>
                    <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-1/3"></div>
                    </div>
                 </div>
               </div>
            </div>
          ))}

          {categories.length === 0 && !loading && (
            <div className="col-span-full py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
               <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                 <Package className="text-gray-300" size={40} />
               </div>
               <h3 className="text-xl font-bold text-gray-400">No categories found</h3>
               <p className="text-gray-400 mt-1">Start by adding your first product category</p>
               <button onClick={() => setShowModal(true)} className="mt-6 text-primary font-bold hover:underline">Add Category Now</button>
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
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">New Category</h2>
                  <p className="text-sm text-gray-500 font-medium">Add a fresh category to your store</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Category Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Beverages"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-medium"
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the category..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-medium"
                    value={newCat.description}
                    onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-medium"
                    value={newCat.imageUrl}
                    onChange={(e) => setNewCat({ ...newCat, imageUrl: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <button
                    disabled={isSubmitting}
                    className="w-full py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Category'}
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

