'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, Truck, Ruler, Phone, Mail, MapPin, 
  Building2, Shield, ToggleLeft, ToggleRight, Boxes, 
  Scale, ArrowUpCircle, Plus, Trash2, Pill, Activity,
  Download, MessageSquare, Lock, UtensilsCrossed
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

const SETTINGS_API_URL = `${BASE_URL}/settings`;

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(SETTINGS_API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Sync failure'));
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      showToast({ title: getErrorMessage(error, 'System out of sync'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: any) => {
    const prevValue = settings[key];
    const stringValue = String(value);
    
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setSaving(key);

    try {
      const res = await fetchWithAuth(`${SETTINGS_API_URL}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: stringValue }),
      });

      if (!res.ok) throw new Error(await parseApiError(res, 'Transmission failed'));
      showToast({ title: `${key.replace(/_/g, ' ')} synchronized`, variant: 'success' });
    } catch (error) {
      setSettings((prev: any) => ({ ...prev, [key]: prevValue }));
      showToast({ title: getErrorMessage(error, 'Remote update failed'), variant: 'error' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Syncing Core...</p>
      </div>
    );
  }

  return (
    <div className="page-container !max-w-5xl mx-auto space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
               <Shield size={24} className="text-primary-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">System Core</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Platform Configuration & Logic Engine</p>
        </div>
      </div>

      <div className="grid gap-16">
        {/* Logistics Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic">Logistics Matrix</h2>
          </div>
          
          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-slate-900/5 p-6 border-b border-slate-100 flex items-center gap-3">
              <Truck size={18} className="text-primary-600" />
              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Standard Delivery Parameters</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <SettingsInput 
                  label="Base Fee (PKR)" 
                  icon="Rs" 
                  value={settings.delivery_base_fee} 
                  onSave={(v: any) => handleUpdate('delivery_base_fee', v)}
                  isSaving={saving === 'delivery_base_fee'}
                />
                <SettingsInput 
                  label="Threshold (KM)" 
                  icon={<Ruler size={14} />} 
                  value={settings.delivery_threshold_km} 
                  onSave={(v: any) => handleUpdate('delivery_threshold_km', v)}
                  isSaving={saving === 'delivery_threshold_km'}
                />
                <SettingsInput 
                  label="Rate per KM" 
                  icon="Rs" 
                  value={settings.delivery_per_km_fee} 
                  onSave={(v: any) => handleUpdate('delivery_per_km_fee', v)}
                  isSaving={saving === 'delivery_per_km_fee'}
                />
              </div>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-rose-900/5 p-6 border-b border-slate-100 flex items-center gap-3">
              <UtensilsCrossed size={18} className="text-rose-600" />
              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Dining (Food) Logistics</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-4 gap-6">
                <SettingsInput label="Food Base" icon="Rs" value={settings.food_delivery_base_fee} onSave={(v: any) => handleUpdate('food_delivery_base_fee', v)} isSaving={saving === 'food_delivery_base_fee'} />
                <SettingsInput label="Food Threshold" icon="Km" value={settings.food_delivery_threshold_km} onSave={(v: any) => handleUpdate('food_delivery_threshold_km', v)} isSaving={saving === 'food_delivery_threshold_km'} />
                <SettingsInput label="Food Rate/KM" icon="Rs" value={settings.food_delivery_per_km_fee} onSave={(v: any) => handleUpdate('food_delivery_per_km_fee', v)} isSaving={saving === 'food_delivery_per_km_fee'} />
                <SettingsInput label="Food Max Radius" icon="Km" value={settings.food_delivery_max_radius_km} onSave={(v: any) => handleUpdate('food_delivery_max_radius_km', v)} isSaving={saving === 'food_delivery_max_radius_km'} />
              </div>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-teal-900/5 p-6 border-b border-slate-100 flex items-center gap-3">
              <Activity size={18} className="text-teal-600" />
              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Pharma Specific Logistics</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <SettingsInput label="Pharma Base" icon="Rs" value={settings.pharma_delivery_base_fee} onSave={(v: any) => handleUpdate('pharma_delivery_base_fee', v)} isSaving={saving === 'pharma_delivery_base_fee'} />
                <SettingsInput label="Pharma Limit" icon="Km" value={settings.pharma_delivery_max_radius_km} onSave={(v: any) => handleUpdate('pharma_delivery_max_radius_km', v)} isSaving={saving === 'pharma_delivery_max_radius_km'} />
                 <SettingsInput label="Multi-Resto Link" icon={<Boxes size={14} />} value={settings.multi_restaurant_max_distance_km} onSave={(v: any) => handleUpdate('multi_restaurant_max_distance_km', v)} isSaving={saving === 'multi_restaurant_max_distance_km'} />
              </div>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-orange-900/5 p-6 border-b border-slate-100 flex items-center gap-3">
              <Boxes size={18} className="text-orange-600" />
              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Bulk Rashan Logic Grid</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <SettingsInput label="Rashan Base" icon="Rs" value={settings.rashan_base_fee} onSave={(v: any) => handleUpdate('rashan_base_fee', v)} isSaving={saving === 'rashan_base_fee'} />
                <SettingsInput label="Surcharge (Med)" icon="Rs" value={settings.rashan_surcharge_medium} onSave={(v: any) => handleUpdate('rashan_surcharge_medium', v)} isSaving={saving === 'rashan_surcharge_medium'} />
                <SettingsInput label="Surcharge (Heavy)" icon="Rs" value={settings.rashan_surcharge_heavy} onSave={(v: any) => handleUpdate('rashan_surcharge_heavy', v)} isSaving={saving === 'rashan_surcharge_heavy'} />
                <SettingsInput label="Floor (1-3)" icon="Rs" value={settings.rashan_floor_surcharge_low} onSave={(v: any) => handleUpdate('rashan_floor_surcharge_low', v)} isSaving={saving === 'rashan_floor_surcharge_low'} />
                <SettingsInput label="Floor (4+)" icon="Rs" value={settings.rashan_floor_surcharge_high} onSave={(v: any) => handleUpdate('rashan_floor_surcharge_high', v)} isSaving={saving === 'rashan_floor_surcharge_high'} />
                <SettingsInput label="Placement Fee" icon="Rs" value={settings.rashan_placement_fee} onSave={(v: any) => handleUpdate('rashan_placement_fee', v)} isSaving={saving === 'rashan_placement_fee'} />
              </div>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-slate-950 p-6 border-b border-slate-100 flex items-center gap-3">
              <Shield size={18} className="text-primary-400" />
              <span className="font-black text-white uppercase tracking-widest text-[10px]">Risk Management (COD & Suspension)</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-4 gap-6">
                <SettingsInput 
                  label="Food COD Limit" 
                  icon="Rs" 
                  value={settings.cod_limit_food} 
                  onSave={(v: any) => handleUpdate('cod_limit_food', v)}
                  isSaving={saving === 'cod_limit_food'}
                />
                <SettingsInput 
                  label="Pharma COD Limit" 
                  icon="Rs" 
                  value={settings.cod_limit_pharma} 
                  onSave={(v: any) => handleUpdate('cod_limit_pharma', v)}
                  isSaving={saving === 'cod_limit_pharma'}
                />
                <SettingsInput 
                  label="Mart COD Limit" 
                  icon="Rs" 
                  value={settings.cod_limit_mart} 
                  onSave={(v: any) => handleUpdate('cod_limit_mart', v)}
                  isSaving={saving === 'cod_limit_mart'}
                />
                <SettingsInput 
                  label="Rider Cash Limit" 
                  icon="Rs" 
                  value={settings.rider_cod_threshold} 
                  onSave={(v: any) => handleUpdate('rider_cod_threshold', v)}
                  isSaving={saving === 'rider_cod_threshold'}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                * Orders exceeding COD limits require online payment. Riders exceeding Cash Limit are auto-suspended.
              </p>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="bg-indigo-900/5 p-6 border-b border-slate-100 flex items-center gap-3">
              <Scale size={18} className="text-indigo-600" />
              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Monetization & Commission Matrix</span>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-4 gap-6">
                <SettingsInput label="Platform Fee (₨)" icon="Rs" value={settings.platform_service_fee} onSave={(v: any) => handleUpdate('platform_service_fee', v)} isSaving={saving === 'platform_service_fee'} />
                <div className="md:col-span-3" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                Commission Rates by Vertical (%)
              </p>
              <div className="grid md:grid-cols-4 gap-6">
                <SettingsInput label="Food (%)" icon="%" value={settings.commission_rate_food} onSave={(v: any) => handleUpdate('commission_rate_food', v)} isSaving={saving === 'commission_rate_food'} />
                <SettingsInput label="Mart (%)" icon="%" value={settings.commission_rate_mart} onSave={(v: any) => handleUpdate('commission_rate_mart', v)} isSaving={saving === 'commission_rate_mart'} />
                <SettingsInput label="Pharma (%)" icon="%" value={settings.commission_rate_pharma} onSave={(v: any) => handleUpdate('commission_rate_pharma', v)} isSaving={saving === 'commission_rate_pharma'} />
                <SettingsInput label="Rashan (%)" icon="%" value={settings.commission_rate_rashan} onSave={(v: any) => handleUpdate('commission_rate_rashan', v)} isSaving={saving === 'commission_rate_rashan'} />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                Commission Bounds — Min / Max per Vertical (₨)
              </p>
              <div className="grid md:grid-cols-4 gap-6">
                <SettingsInput label="Min Food" icon="Rs" value={settings.min_commission_food} onSave={(v: any) => handleUpdate('min_commission_food', v)} isSaving={saving === 'min_commission_food'} />
                <SettingsInput label="Max Food" icon="Rs" value={settings.max_commission_food} onSave={(v: any) => handleUpdate('max_commission_food', v)} isSaving={saving === 'max_commission_food'} />
                <SettingsInput label="Min Mart" icon="Rs" value={settings.min_commission_mart} onSave={(v: any) => handleUpdate('min_commission_mart', v)} isSaving={saving === 'min_commission_mart'} />
                <SettingsInput label="Max Mart" icon="Rs" value={settings.max_commission_mart} onSave={(v: any) => handleUpdate('max_commission_mart', v)} isSaving={saving === 'max_commission_mart'} />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                * Set min/max to 0 to disable bounds. Changes take effect on the next order settlement instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Healthcare Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic">Healthcare Engine</h2>
          </div>
          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="p-8 grid md:grid-cols-2 gap-6">
              {[
                { key: 'pharma_skip_prescription_verification', label: 'Bypass Rx Verification', desc: 'Auto-approve prescription meds' },
                { key: 'feature_pharma_lab_tests_enabled', label: 'Lab Diagnostics', desc: 'Home sample collection module' },
                { key: 'feature_pharma_doctor_consultations_enabled', label: 'Tele-Health', desc: 'Virtual doctor appointments' },
                { key: 'feature_pharma_reminders_enabled', label: 'Dose Reminders', desc: 'Pill schedule notifications' },
              ].map(({ key, label, desc }) => (
                <SettingsToggle 
                  key={key}
                  label={label}
                  desc={desc}
                  isEnabled={settings[key] === 'true' || settings[key] === true}
                  onToggle={(val: any) => handleUpdate(key, val)}
                  isSaving={saving === key}
                  variant="teal"
                />
              ))}
            </div>
          </div>
        </section>

        {/* Security & Access Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic">Security & Access</h2>
          </div>
          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { key: 'auth_customer_mpin_enabled', label: 'Customer MPIN', desc: 'Primary customer login' },
                { key: 'auth_customer_otp_enabled', label: 'Customer OTP', desc: 'One-Time Password login' },
                { key: 'auth_customer_google_enabled', label: 'Customer Google', desc: 'Third-party auth' },
                { key: 'auth_rider_mpin_enabled', label: 'Rider MPIN', desc: 'Secure rider terminal' },
                { key: 'feature_chat_enabled', label: 'Order Chat', desc: 'In-app messaging gateway' },
              ].map(({ key, label, desc }) => (
                <SettingsToggle 
                  key={key}
                  label={label}
                  desc={desc}
                  isEnabled={settings[key] === 'true' || settings[key] === true}
                  onToggle={(val: any) => handleUpdate(key, val)}
                  isSaving={saving === key}
                  variant="purple"
                />
              ))}
            </div>
          </div>
        </section>

        {/* Global Features Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic">App Orchestration</h2>
          </div>
          <div className="card !p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
             <div className="p-8 grid md:grid-cols-3 gap-6">
              {[
                { key: 'feature_show_mart', label: 'Mart Module', variant: 'blue' },
                { key: 'feature_show_restaurants', label: 'Food Module', variant: 'blue' },
                { key: 'feature_show_pharma', label: 'Pharma Module', variant: 'blue' },
                { key: 'feature_rashan_enabled', label: 'Rashan Bulk', variant: 'orange' },
                { key: 'feature_show_brands', label: 'Brand Center', variant: 'purple' },
              ].map(({ key, label, variant }: any) => (
                <SettingsToggle 
                  key={key}
                  label={label}
                  desc={settings[key] === 'true' || settings[key] === true ? 'Module Live' : 'Module Hidden'}
                  isEnabled={settings[key] === 'true' || settings[key] === true}
                  onToggle={(val: any) => handleUpdate(key, val)}
                  isSaving={saving === key}
                  variant={variant}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Retail Identity Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest italic">Retail Identity</h2>
          </div>
          <div className="card !p-8 border border-slate-100 shadow-xl shadow-slate-200/20 !rounded-[2.5rem]">
            <div className="grid md:grid-cols-2 gap-8">
              <SettingsInput 
                label="Support Line" 
                icon={<Phone size={14} />} 
                value={settings.contact_phone} 
                onSave={(v: any) => handleUpdate('contact_phone', v)}
                isSaving={saving === 'contact_phone'}
              />
              <SettingsInput 
                label="Support Email" 
                icon={<Mail size={14} />} 
                value={settings.contact_email} 
                onSave={(v: any) => handleUpdate('contact_email', v)}
                isSaving={saving === 'contact_email'}
              />
               <div className="md:col-span-2 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Operations Hub</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <span className="absolute left-4 top-4 text-slate-400 group-focus-within:text-primary-500 transition-colors"><MapPin size={16} /></span>
                      <textarea
                        value={settings.mart_location || ''}
                        onChange={(e) => setSettings((prev: any) => ({ ...prev, mart_location: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none transition-all h-24 italic shadow-inner"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdate('mart_location', settings.mart_location)}
                      disabled={saving === 'mart_location'}
                      className="w-16 h-24 bg-slate-900 text-white rounded-3xl flex items-center justify-center hover:bg-black transition-all disabled:opacity-20 active:scale-95 shadow-lg shadow-slate-900/20"
                    >
                      {saving === 'mart_location' ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsInput({ label, icon, value, onSave, isSaving }: any) {
  const [localValue, setLocalValue] = useState(value || '');
  useEffect(() => { setLocalValue(value || ''); }, [value]);

  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 font-black text-[12px] transition-colors">{icon}</span>
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none transition-all placeholder:text-slate-300"
          />
        </div>
        <button
          onClick={() => onSave(localValue)}
          disabled={isSaving || String(localValue) === String(value)}
          className="w-12 h-[51px] bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all disabled:opacity-20 active:scale-95 shadow-lg shadow-slate-900/10"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={18} />}
        </button>
      </div>
    </div>
  );
}

function SettingsToggle({ label, desc, isEnabled, onToggle, isSaving, variant = 'teal' }: any) {
  const colors: any = {
    teal: isEnabled ? 'bg-teal-500' : 'bg-slate-200',
    blue: isEnabled ? 'bg-blue-600' : 'bg-slate-200',
    orange: isEnabled ? 'bg-orange-500' : 'bg-slate-200',
    purple: isEnabled ? 'bg-purple-600' : 'bg-slate-200'
  };

  return (
    <div className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all group border-b-4 border-b-transparent hover:border-b-primary-500/10">
      <div className="min-w-0">
        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{label}</p>
        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter truncate">{desc}</p>
      </div>
      <button
        disabled={isSaving}
        onClick={() => onToggle(!isEnabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${colors[variant]}`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-premium ${isEnabled ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}
        >
          {isSaving ? <RefreshCw className="animate-spin text-slate-400" size={10} /> : <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? colors[variant] : 'bg-slate-300'}`} />}
        </span>
      </button>
    </div>
  );
}
