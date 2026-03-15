'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Truck, ArrowRight, Ruler } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

const SETTINGS_API_URL = 'http://localhost:3000/api/v1/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(SETTINGS_API_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
      setSaving(true);
      const res = await fetchWithAuth(`${SETTINGS_API_URL}/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      setMessage(`${key} updated successfully!`);
      setTimeout(() => setMessage(''), 3000);
      fetchSettings();
    } catch (error) {
      console.error('Update failed:', error);
      setMessage('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-500 mt-1">Manage global app configurations and delivery rates.</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg ${message.includes('failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="grid gap-8">
        {/* Delivery Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center space-x-3">
            <Truck className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Delivery Fee Structure</h2>
          </div>
          
          <div className="p-6 space-y-8">
            <p className="text-sm text-gray-500 bg-blue-50 p-4 rounded-xl">
              <strong>Dynamic Formula:</strong> Delivery Fee = Base Fee + ( (Distance - Threshold) × Per KM Fee )
              <br />
              <em>* If distance is less than threshold, only the Base Fee applies.</em>
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Base Fee */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Base Delivery Fee (Rs.)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs.</span>
                    <input
                      type="number"
                      value={settings.delivery_base_fee || ''}
                      onChange={(e) => handleSettingChange('delivery_base_fee', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition"
                      placeholder="150"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdate('delivery_base_fee', settings.delivery_base_fee)}
                    disabled={saving}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Minimum charge for any successful delivery.</p>
              </div>

              {/* Threshold Distance */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Base Distance Threshold (KM)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ruler size={16}/></span>
                    <input
                      type="number"
                      value={settings.delivery_threshold_km || ''}
                      onChange={(e) => handleSettingChange('delivery_threshold_km', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition"
                      placeholder="3"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdate('delivery_threshold_km', settings.delivery_threshold_km)}
                    disabled={saving}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Distance covered by the base fee without extra charges.</p>
              </div>

              {/* Per KM Fee */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Per KM Surcharge (Rs./KM)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs.</span>
                    <input
                      type="number"
                      value={settings.delivery_per_km_fee || ''}
                      onChange={(e) => handleSettingChange('delivery_per_km_fee', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition"
                      placeholder="20"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdate('delivery_per_km_fee', settings.delivery_per_km_fee)}
                    disabled={saving}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Added for every kilometer beyond the threshold distance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings Placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-60">
           <div className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowRight size={20} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">More configurations coming soon...</h3>
                  <p className="text-xs text-gray-400">Store status, tax rates, and security preferences.</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
