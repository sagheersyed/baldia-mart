'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Map, Play, Pause, MapPin, Globe, Settings as SettingsIcon, X, RefreshCcw, Check } from 'lucide-react';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

interface DeliveryZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  createdAt: string;
}

const API_URL = `${BASE_URL}/zones`;

export default function ZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState<string>('open');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<string>('0');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    centerLat: '24.9144',
    centerLng: '66.9748',
    radiusKm: '50',
  });

  useEffect(() => {
    fetchZones();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        setStoreStatus(data.store_status || 'open');
        setDeliveryFee(data.delivery_base_fee || '0');
        setTaxRate(data.tax_rate_percentage || '0');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/all`);
      if (!res.ok) throw new Error('Failed to fetch zones');
      const data = await res.json();
      setZones(data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZoneStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/${id}/toggle`, { method: 'PUT' });
      if (res.ok) {
        setZones(zones.map(z => z.id === id ? { ...z, isActive: !currentStatus } : z));
      }
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const toggleStoreStatus = async () => {
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    try {
      const res = await fetchWithAuth(`${BASE_URL}/settings/store_status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newStatus }),
      });
      if (res.ok) {
        setStoreStatus(newStatus);
      }
    } catch (error) {
      console.error('Error toggling store status:', error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await fetchWithAuth(`${BASE_URL}/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newZone.name,
          centerLat: parseFloat(newZone.centerLat),
          centerLng: parseFloat(newZone.centerLng),
          radiusKm: parseFloat(newZone.radiusKm),
        }),
      });
      if (res.ok) {
        setCreateSuccess(true);
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess(false);
          setNewZone({ name: '', centerLat: '24.9144', centerLng: '66.9748', radiusKm: '50' });
          fetchZones();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating zone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Delivery Zones</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Globe size={16} className="mr-2 text-primary" />
            Manage geofencing and hyperlocal radius rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchZones} className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-primary hover:border-primary/20 transition">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
          >
            <Plus size={20} />
            <span>Create New Zone</span>
          </button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center">
          <Map className="mr-3 text-primary" size={24} />
          Configured Regions
        </h2>
        
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : zones.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-bold text-gray-400 text-lg">No delivery zones configured</p>
            <p className="text-gray-400 mt-1">Click "Create New Zone" to set up your delivery boundary.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-md shadow-orange-500/20"
            >
              <Plus size={16} className="inline mr-2" />
              Create Your First Zone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map(zone => (
              <div key={zone.id} className={`p-6 border-2 rounded-3xl relative overflow-hidden transition-all ${zone.isActive ? 'border-primary shadow-md shadow-orange-500/10' : 'border-gray-200 opacity-75'}`}>
                <div className="absolute right-0 top-0 opacity-[0.03] scale-150 translate-x-1/4 -translate-y-1/4 pointer-events-none">
                  <Globe size={200} />
                </div>
                
                <div className="flex justify-between items-start mb-4 relative">
                  <h3 className="font-black text-xl text-gray-900 truncate pr-4">{zone.name}</h3>
                  <button 
                    onClick={() => toggleZoneStatus(zone.id, zone.isActive)}
                    className={`p-2 rounded-full shadow-sm transition-colors ${zone.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}
                    title={zone.isActive ? 'Suspend Zone' : 'Activate Zone'}
                  >
                    {zone.isActive ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                  </button>
                </div>

                <div className="space-y-3 relative">
                  <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
                    <span className="font-bold text-gray-500">Service Radius</span>
                    <span className="font-black text-primary text-lg">{zone.radiusKm} <span className="text-xs">km</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white border border-gray-100 rounded-xl">
                      <span className="block text-gray-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Center Latitude</span>
                      <span className="font-bold text-gray-900">{Number(zone.centerLat).toFixed(4)}</span>
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-xl">
                      <span className="block text-gray-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Center Longitude</span>
                      <span className="font-bold text-gray-900">{Number(zone.centerLng).toFixed(4)}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-400 flex items-center justify-center pt-2">
                    <span className={`w-2 h-2 rounded-full mr-2 ${zone.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-gray-300'}`}></span>
                    {zone.isActive ? 'Currently Enforcing Bounds' : 'Inactive'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex space-x-6">
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-[2.5rem] border border-blue-100 flex items-start space-x-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500 shrink-0"><Globe size={24} /></div>
          <div>
            <h3 className="font-black text-blue-900 text-lg mb-2">Hyperlocal Strict Mode</h3>
            <p className="text-blue-800/80 font-medium text-sm leading-relaxed">
              Any order placed beyond an active zone's radius will automatically be rejected by the backend algorithm to maintain rapid delivery SLAs.
            </p>
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-[2.5rem] border border-orange-100 flex items-start space-x-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-primary shrink-0"><SettingsIcon size={24} /></div>
          <div className="flex-1">
            <h3 className="font-black text-orange-900 text-lg mb-2">Global Marketplace Status</h3>
            <p className="text-orange-800/80 font-medium text-sm leading-relaxed mb-4">
              Master kill-switch. Toggling this will instantly mark the store as "Closed" for all users, rejecting new orders.
            </p>
            <button 
              onClick={toggleStoreStatus}
              className={`px-5 py-2.5 font-black rounded-xl text-sm shadow-sm hover:shadow-md transition border ${
                storeStatus === 'open' 
                  ? 'bg-white border-orange-200 text-orange-600' 
                  : 'bg-red-600 border-red-700 text-white'
              }`}
            >
              {storeStatus === 'open' ? '🟢 Store is Currently OPEN' : '🔴 Store is CLOSED (Kill-Switch Active)'}
            </button>
            
            <div className="mt-6 space-y-4 pt-4 border-t border-orange-100">
              <div>
                <label className="block text-xs font-bold text-orange-900 uppercase tracking-widest mb-1">Base Delivery Fee (Rs.)</label>
                <input 
                  type="number" 
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  onBlur={() => updateSetting('delivery_base_fee', deliveryFee)}
                  className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg text-orange-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-900 uppercase tracking-widest mb-1">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  onBlur={() => updateSetting('tax_rate_percentage', taxRate)}
                  className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg text-orange-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Zone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Create Delivery Zone</h2>
                <p className="text-sm font-bold text-gray-400 mt-1">Define a new geofencing service boundary</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition">
                <X size={20} />
              </button>
            </div>

            {createSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  <Check size={32} className="text-white" />
                </div>
                <p className="font-black text-xl text-gray-900">Zone Created!</p>
                <p className="text-gray-500 font-medium">Your new zone is now active.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateZone} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Zone Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Baldia Town & Surroundings"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition font-bold"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Center Latitude</label>
                    <input
                      required
                      type="number"
                      step="0.0001"
                      placeholder="24.9144"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition font-bold"
                      value={newZone.centerLat}
                      onChange={(e) => setNewZone({ ...newZone, centerLat: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Center Longitude</label>
                    <input
                      required
                      type="number"
                      step="0.0001"
                      placeholder="66.9748"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition font-bold"
                      value={newZone.centerLng}
                      onChange={(e) => setNewZone({ ...newZone, centerLng: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Service Radius (km)</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="1"
                    max="500"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition font-bold"
                    value={newZone.radiusKm}
                    onChange={(e) => setNewZone({ ...newZone, radiusKm: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Standard hyperlocal delivery is 50km. Orders outside this radius are auto-rejected.
                  </p>
                </div>

                <button
                  disabled={isSubmitting}
                  className="w-full py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-[1.5rem] font-black text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Zone...
                    </>
                  ) : (
                    <>
                      <MapPin size={20} />
                      Create Zone
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
