'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Tag, Calendar, Users, Percent, DollarSign, 
  Trash2, Edit2, CheckCircle, XCircle, Search, 
  RefreshCw, ChevronRight, X, AlertCircle, Clock
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
  user_limit: number;
  isActive: boolean;
  eligible_vendors?: string[];
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { execute, loading } = useAsyncData();

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_discount_amount: 0,
    min_order_value: 0,
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    usage_limit: 0,
    user_limit: 1,
    isActive: true,
  });

  const loadCoupons = async () => {
    const res = await execute(async () => {
      const r = await fetchWithAuth(`${BASE_URL}/coupons?page=${page}&limit=10`);
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to load coupons'));
      return r.json();
    });
    if (res) {
      setCoupons(res.data);
      setTotal(res.total);
    }
  };

  useEffect(() => { loadCoupons(); }, [page]);

  const handleToggleStatus = async (coupon: Coupon) => {
    const res = await execute(async () => {
      const r = await fetchWithAuth(`${BASE_URL}/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive })
      });
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to update coupon'));
      return r.json();
    });
    if (res) {
      showToast({ title: coupon.isActive ? 'Coupon Deactivated' : 'Coupon Activated', variant: 'success' });
      loadCoupons();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    const res = await execute(async () => {
      const r = await fetchWithAuth(`${BASE_URL}/coupons/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to delete coupon'));
      return r.json();
    });
    if (res) {
      showToast({ title: 'Coupon Deleted Successfully', variant: 'success' });
      loadCoupons();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCoupon ? `${BASE_URL}/coupons/${editingCoupon.id}` : `${BASE_URL}/coupons`;
    const method = editingCoupon ? 'PUT' : 'POST';
    
    // Convert dates to ISO
    const payload = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    const res = await execute(async () => {
      const r = await fetchWithAuth(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to save coupon'));
      return r.json();
    });
    if (res) {
      showToast({ title: editingCoupon ? 'Coupon Updated' : 'Coupon Created', variant: 'success' });
      setIsModalOpen(false);
      setEditingCoupon(null);
      loadCoupons();
    }
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      max_discount_amount: Number(coupon.max_discount_amount || 0),
      min_order_value: Number(coupon.min_order_value),
      start_date: format(new Date(coupon.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(coupon.end_date), "yyyy-MM-dd'T'HH:mm"),
      usage_limit: coupon.usage_limit,
      user_limit: coupon.user_limit,
      isActive: coupon.isActive,
    });
    setIsModalOpen(true);
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Promo Arsenal</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-5">Campaign Management Terminal</p>
        </div>
        
        <button 
          onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-3 px-8 py-4 shadow-xl shadow-indigo-200"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-widest">Forge New Coupon</span>
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Active Campaigns', value: coupons.filter(c => c.isActive).length, icon: Tag, color: 'text-indigo-600' },
          { label: 'Total Used', value: coupons.reduce((acc, c) => acc + Number(c.used_count), 0), icon: Users, color: 'text-emerald-600' },
          { label: 'Avg Discount', value: '15%', icon: Percent, color: 'text-amber-600' },
          { label: 'Revenue Saved', value: 'Rs. 12.4k', icon: DollarSign, color: 'text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="card p-6 flex items-center gap-6 group hover:border-indigo-200 transition-all">
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color} group-hover:bg-indigo-50 transition-colors`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by code or vendor scope..." 
              className="w-full pl-12 pr-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
            />
          </div>
          
          <button onClick={loadCoupons} className="p-3 text-slate-400 hover:text-indigo-600 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Code</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount Logic</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage Payload</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Validity Range</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-4" size={40} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
                  </td>
                </tr>
              ) : coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${coupon.isActive ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">{coupon.code}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase tracking-tighter">
                          ID: {coupon.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black">
                        {coupon.discount_type === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `Rs. ${coupon.discount_value} OFF`}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          Min Order: Rs. {coupon.min_order_value}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-2">
                       <div className="flex justify-between items-end w-32">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Consumption</span>
                         <span className="text-[10px] font-black text-slate-900">{coupon.used_count} / {coupon.usage_limit || '∞'}</span>
                       </div>
                       <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${coupon.usage_limit ? (Number(coupon.used_count) / Number(coupon.usage_limit)) * 100 : 100}%` }}
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[10px] font-bold text-slate-600 space-y-1 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-emerald-500" />
                        <span>{format(new Date(coupon.start_date), 'MMM dd, HH:mm')}</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span>{format(new Date(coupon.end_date), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleToggleStatus(coupon)}
                        className={`p-2 rounded-xl border transition-all ${coupon.isActive ? 'text-amber-600 border-amber-100 hover:bg-amber-50' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                        title={coupon.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                      <button 
                         onClick={() => openEditModal(coupon)}
                        className="p-2 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(coupon.id)}
                        className="p-2 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
           <Pagination 
             page={page} 
             totalPages={totalPages} 
             onPageChange={setPage} 
           />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 transition-all">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-slate-100">
            <header className="px-10 py-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{editingCoupon ? 'Optimize Protocol' : 'Forge New Protocol'}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuring Discount Logic Engine</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </header>

            <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Active Code</label>
                  <input 
                    required
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="BALDIA10"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reward Class</label>
                  <select 
                    value={formData.discount_type}
                    onChange={e => setFormData({...formData, discount_type: e.target.value as any})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rs.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Discount Magnitude</label>
                  <input 
                    type="number"
                    value={formData.discount_value}
                    onChange={e => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                {formData.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ceiling Amount (Optional)</label>
                    <input 
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={e => setFormData({...formData, max_discount_amount: parseFloat(e.target.value)})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Activation Date</label>
                  <input 
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Deactivation Date</label>
                  <input 
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

               <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Min Order</label>
                  <input 
                    type="number"
                    value={formData.min_order_value}
                    onChange={e => setFormData({...formData, min_order_value: parseFloat(e.target.value)})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global Limit (0=∞)</label>
                  <input 
                    type="number"
                    value={formData.usage_limit}
                    onChange={e => setFormData({...formData, usage_limit: parseInt(e.target.value)})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">User Limit</label>
                  <input 
                    type="number"
                    value={formData.user_limit}
                    onChange={e => setFormData({...formData, user_limit: parseInt(e.target.value)})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-[2rem]">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocol Integrity Verification</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">This coupon will be immediately eligible for valid carts upon creation.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${formData.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white transition-all transform ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="pt-6 border-t border-slate-50 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Terminate Sequence
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-5 rounded-[1.5rem] bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : editingCoupon ? 'Apply Optimization' : 'Execute Creation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
