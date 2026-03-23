'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Pencil, MapPin, ChefHat, Clock, UtensilsCrossed } from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  cuisineType?: string;
  openingHours?: string;
  openingTime?: string;
  closingTime?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  rating?: number;
  menuItems?: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  prepTimeMinutes?: number;
  maxQuantityPerOrder?: number;
}

const API_URL = `${BASE_URL}/restaurants`;
const MENU_API_URL = `${BASE_URL}/menu-items`;

const emptyRestaurantForm = {
  name: '', description: '', logoUrl: '', cuisineType: '',
  openingHours: '', openingTime: '', closingTime: '',
  location: '', latitude: '', longitude: ''
};

const emptyMenuItemForm = {
  name: '', description: '', price: '', discount: '0',
  imageUrl: '', category: '', prepTimeMinutes: '',
  maxQuantityPerOrder: ''
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurantForm);
  const [menuItemForm, setMenuItemForm] = useState(emptyMenuItemForm);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchRestaurants(); }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      const data = await res.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingRestaurant ? `${API_URL}/${editingRestaurant.id}` : API_URL;
      const method = editingRestaurant ? 'PATCH' : 'POST';
      const payload = {
        ...restaurantForm,
        latitude: restaurantForm.latitude ? parseFloat(restaurantForm.latitude) : null,
        longitude: restaurantForm.longitude ? parseFloat(restaurantForm.longitude) : null,
      };
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowRestaurantModal(false);
        setEditingRestaurant(null);
        setRestaurantForm(emptyRestaurantForm);
        fetchRestaurants();
      }
    } catch (err) {
      console.error('Failed to save restaurant:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMenuItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setIsSubmitting(true);
    try {
      const url = editingMenuItem ? `${MENU_API_URL}/${editingMenuItem.id}` : MENU_API_URL;
      const method = editingMenuItem ? 'PATCH' : 'POST';
      const payload = {
        ...menuItemForm,
        restaurantId: selectedRestaurant.id,
        price: parseFloat(menuItemForm.price),
        discount: parseFloat(menuItemForm.discount) || 0,
        prepTimeMinutes: menuItemForm.prepTimeMinutes ? parseInt(menuItemForm.prepTimeMinutes) : null,
        maxQuantityPerOrder: menuItemForm.maxQuantityPerOrder ? parseInt(menuItemForm.maxQuantityPerOrder) : 0,
      };
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowMenuModal(false);
        setEditingMenuItem(null);
        setMenuItemForm(emptyMenuItemForm);
        fetchRestaurants();
      }
    } catch (err) {
      console.error('Failed to save menu item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm('Delete this restaurant?')) return;
    await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
    fetchRestaurants();
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    await fetchWithAuth(`${MENU_API_URL}/${id}`, { method: 'DELETE' });
    fetchRestaurants();
  };

  const openEditRestaurant = (r: Restaurant) => {
    setEditingRestaurant(r);
    setRestaurantForm({
      name: r.name, description: r.description || '', logoUrl: r.logoUrl || '',
      cuisineType: r.cuisineType || '', openingHours: r.openingHours || '',
      openingTime: r.openingTime || '', closingTime: r.closingTime || '',
      location: r.location || '',
      latitude: r.latitude ? r.latitude.toString() : '',
      longitude: r.longitude ? r.longitude.toString() : '',
    });
    setShowRestaurantModal(true);
  };

  const openEditMenuItem = (item: MenuItem, restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setEditingMenuItem(item);
    setMenuItemForm({
      name: item.name, description: item.description || '',
      price: item.price.toString(), discount: item.discount.toString(),
      imageUrl: item.imageUrl || '', category: item.category || '',
      prepTimeMinutes: item.prepTimeMinutes?.toString() || '',
      maxQuantityPerOrder: item.maxQuantityPerOrder?.toString() || '',
    });
    setShowMenuModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900">🍽️ Restaurants</h1>
            <p className="text-gray-400 font-medium mt-1">Manage food restaurants and their menus</p>
          </div>
          <button
            onClick={() => { setEditingRestaurant(null); setRestaurantForm(emptyRestaurantForm); setShowRestaurantModal(true); }}
            className="flex items-center space-x-2 bg-gradient-to-br from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            <span>Add Restaurant</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {restaurants.map(restaurant => (
              <div key={restaurant.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Restaurant Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden">
                      {restaurant.logoUrl
                        ? <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover rounded-2xl" />
                        : <UtensilsCrossed size={28} className="text-orange-400" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{restaurant.name}</h2>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {restaurant.cuisineType && (
                          <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            <ChefHat size={10} /> {restaurant.cuisineType}
                          </span>
                        )}
                        {restaurant.openingHours && (
                          <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <Clock size={10} /> {restaurant.openingHours}
                          </span>
                        )}
                        {restaurant.location && (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <MapPin size={10} /> {restaurant.location}
                          </span>
                        )}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${restaurant.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {restaurant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedRestaurant(restaurant); setEditingMenuItem(null); setMenuItemForm(emptyMenuItemForm); setShowMenuModal(true); }}
                      className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      <Plus size={14} /> Add Menu Item
                    </button>
                    <button onClick={() => openEditRestaurant(restaurant)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteRestaurant(restaurant.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Menu Items */}
                {restaurant.menuItems && restaurant.menuItems.length > 0 ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurant.menuItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            : <span className="text-xl">🍽️</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                          {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                          <p className="text-sm font-black text-orange-500">
                            Rs {(item.price - item.discount).toFixed(0)}
                            {item.discount > 0 && <span className="text-gray-400 text-xs line-through ml-1">Rs {item.price}</span>}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => openEditMenuItem(item, restaurant)} className="p-1 text-blue-400 hover:text-blue-600">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteMenuItem(item.id)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">No menu items yet. Add the first item!</div>
                )}
              </div>
            ))}
            {restaurants.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold text-gray-400">No restaurants yet</h3>
                <p className="text-gray-300 mt-2">Add your first restaurant partner to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Modal */}
      {showRestaurantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-7 border-b border-gray-100">
              <h2 className="text-2xl font-black">{editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
              <button onClick={() => setShowRestaurantModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleRestaurantSubmit} className="p-7 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Restaurant Name *</label>
                <input required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.name} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Logo URL</label>
                <input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.logoUrl} onChange={e => setRestaurantForm({ ...restaurantForm, logoUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold resize-none" value={restaurantForm.description} onChange={e => setRestaurantForm({ ...restaurantForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cuisine Type</label>
                  <input placeholder="e.g., Pakistani, BBQ" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.cuisineType} onChange={e => setRestaurantForm({ ...restaurantForm, cuisineType: e.target.value })} />
                </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Display Hours</label>
                  <input placeholder="e.g., 9AM - 11PM" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.openingHours} onChange={e => setRestaurantForm({ ...restaurantForm, openingHours: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Open Time</label>
                  <input type="time" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.openingTime} onChange={e => setRestaurantForm({ ...restaurantForm, openingTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Close Time</label>
                  <input type="time" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.closingTime} onChange={e => setRestaurantForm({ ...restaurantForm, closingTime: e.target.value })} />
                </div>
              </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location Address</label>
                <input placeholder="e.g., Shop 5, Baldia Town, Karachi" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.location} onChange={e => setRestaurantForm({ ...restaurantForm, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Latitude</label>
                  <input type="number" step="any" placeholder="24.9152" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.latitude} onChange={e => setRestaurantForm({ ...restaurantForm, latitude: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Longitude</label>
                  <input type="number" step="any" placeholder="66.9643" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={restaurantForm.longitude} onChange={e => setRestaurantForm({ ...restaurantForm, longitude: e.target.value })} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : editingRestaurant ? 'Update Restaurant' : 'Add Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-7 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-black">{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                {selectedRestaurant && <p className="text-sm text-gray-400 mt-1">For: {selectedRestaurant.name}</p>}
              </div>
              <button onClick={() => setShowMenuModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleMenuItemSubmit} className="p-7 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Item Name *</label>
                <input required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={menuItemForm.name} onChange={e => setMenuItemForm({ ...menuItemForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea rows={2} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none resize-none font-bold" value={menuItemForm.description} onChange={e => setMenuItemForm({ ...menuItemForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Price (Rs) *</label>
                  <input required type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={menuItemForm.price} onChange={e => setMenuItemForm({ ...menuItemForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Discount (Rs)</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold" value={menuItemForm.discount} onChange={e => setMenuItemForm({ ...menuItemForm, discount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                  <input placeholder="e.g., Biryani" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={menuItemForm.category} onChange={e => setMenuItemForm({ ...menuItemForm, category: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Prep (mins)</label>
                  <input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={menuItemForm.prepTimeMinutes} onChange={e => setMenuItemForm({ ...menuItemForm, prepTimeMinutes: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Limit (0=No)</label>
                  <input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={menuItemForm.maxQuantityPerOrder} onChange={e => setMenuItemForm({ ...menuItemForm, maxQuantityPerOrder: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                <input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none font-bold" value={menuItemForm.imageUrl} onChange={e => setMenuItemForm({ ...menuItemForm, imageUrl: e.target.value })} />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : editingMenuItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
