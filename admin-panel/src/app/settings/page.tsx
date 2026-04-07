'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Truck, ArrowRight, Ruler, Phone, Mail, MapPin, Building2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ruler size={16} /></span>
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

              {/* Multi-Restaurant Distance Limit */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Multi-Restaurant Max Distance (KM)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ruler size={16} /></span>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.multi_restaurant_max_distance_km || ''}
                      onChange={(e) => handleSettingChange('multi_restaurant_max_distance_km', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition"
                      placeholder="0.4"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate('multi_restaurant_max_distance_km', settings.multi_restaurant_max_distance_km)}
                    disabled={saving}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Max distance allowed between pickup points for batch/multi-stop orders.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Store Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center space-x-3">
            <Building2 className="text-primary" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Store Profile & Location</h2>
          </div>

          <div className="p-6 space-y-8">
            <p className="text-sm text-gray-500 bg-orange-50 p-4 rounded-xl border border-orange-100">
              <strong>Public Info:</strong> This contact information and default location is used across the user and rider apps.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Phone */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Support Phone Number</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16} /></span>
                    <input
                      type="text"
                      value={settings.contact_phone || ''}
                      onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      placeholder="+92 300 0000000"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate('contact_phone', settings.contact_phone)}
                    disabled={saving}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>

              {/* Contact Email */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Support Email</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={16} /></span>
                    <input
                      type="email"
                      value={settings.contact_email || ''}
                      onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      placeholder="support@baldiamart.com"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate('contact_email', settings.contact_email)}
                    disabled={saving}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>

              {/* Mart Location */}
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Primary Mart Location(s)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-gray-400"><MapPin size={16} /></span>
                    <textarea
                      value={settings.mart_location || ''}
                      onChange={(e) => handleSettingChange('mart_location', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none h-24"
                      placeholder="Baldia Town, Sector 4, Karachi"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    <button
                      onClick={() => handleUpdate('mart_location', settings.mart_location)}
                      disabled={saving}
                      className="p-3 bg-primary text-white rounded-xl hover:bg-orange-600 transition disabled:opacity-50 h-[46px]"
                    >
                      <Save size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic">Displayed to riders for pickup validation. In the future, this will support a list of coordinates.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Authentication Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center space-x-3">
          <Shield className="text-purple-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-800">Authentication Configuration</h2>
        </div>

        <div className="p-6 space-y-8">
          <p className="text-sm text-gray-500 bg-purple-50 p-4 rounded-xl border border-purple-100">
            <strong>Security & Cost:</strong> Toggle login methods for Customers and Riders. Disabling expensive methods like OTP or Google Auth can reduce costs. MPIN is highly recommended as the primary login.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Customer Settings */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Customer App</h3>

              {['auth_customer_mpin_enabled', 'auth_customer_otp_enabled', 'auth_customer_google_enabled'].map(key => {
                const label = key.includes('mpin') ? 'MPIN Login' : key.includes('otp') ? 'OTP Login' : 'Google Auth';
                const isEnabled = settings[key] === 'true' || settings[key] === true;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{label}</p>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => handleUpdate(key, isEnabled ? 'false' : 'true')}
                      className={`transition ${isEnabled ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'} disabled:opacity-50`}
                    >
                      {isEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rider Settings */}
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Rider App</h3>

              {['auth_rider_mpin_enabled', 'auth_rider_otp_enabled'].map(key => {
                const label = key.includes('mpin') ? 'MPIN Login' : 'OTP Login';
                const isEnabled = settings[key] === 'true' || settings[key] === true;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{label}</p>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => handleUpdate(key, isEnabled ? 'false' : 'true')}
                      className={`transition ${isEnabled ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'} disabled:opacity-50`}
                    >
                      {isEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center space-x-3">
          <Save className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-800">Feature Visibility</h2>
        </div>

        <div className="p-6 space-y-8">
          <p className="text-sm text-gray-500 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <strong>App Modules:</strong> Enable or disable major sections of the mobile apps in real-time.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {['feature_show_restaurants', 'feature_show_brands'].map(key => {
              const label = key.includes('restaurants') ? 'Restaurant Section' : 'Brand Carousel';
              const isEnabled = settings[key] === 'true' || settings[key] === true;
              return (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{isEnabled ? 'Visible in Mobile Apps' : 'Hidden from Users'}</p>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => handleUpdate(key, isEnabled ? 'false' : 'true')}
                    className={`transition ${isEnabled ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'} disabled:opacity-50`}
                  >
                    {isEnabled ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
