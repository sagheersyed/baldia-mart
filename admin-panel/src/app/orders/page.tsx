'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Eye, Clock, CheckCircle, Truck, XCircle,
  Package, MapPin, Phone, User, Bike, RefreshCw, X, ChevronDown,
  FileText, ExternalLink, Pill, Boxes, ArrowRight, Activity, Zap, ShieldCheck,
  UtensilsCrossed
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';
import { useSettings } from '@/context/SettingsContext';

interface OrderItem {
  id: string; 
  quantity: number | string; 
  priceAtTime: number | string; 
  status: string;
  product?: { id: string; name: string; imageUrl?: string; brand?: { imageUrl?: string; logoUrl?: string }; category?: { imageUrl?: string } };
  medicine?: { id: string; name: string; imageUrl?: string };
  menuItem?: { id: string; name: string; imageUrl?: string };
}

/** Fallback: product image → brand image → category image → '' */
const getOrderItemImage = (item: OrderItem): string => {
  // Menu item
  if (item.menuItem?.imageUrl?.trim()) return item.menuItem.imageUrl;
  // Medicine
  if (item.medicine?.imageUrl?.trim()) return item.medicine.imageUrl;
  // Mart product with full fallback
  const p = item.product;
  if (p) {
    if (p.imageUrl?.trim()) return p.imageUrl;
    if (p.brand?.imageUrl?.trim()) return p.brand.imageUrl!;
    if (p.brand?.logoUrl?.trim()) return p.brand.logoUrl!;
    if (p.category?.imageUrl?.trim()) return p.category.imageUrl!;
  }
  return '';
};
interface Order {
  id: string; status: string; total: number; deliveryFee: number; subtotal: number;
  notes?: string; createdAt: string; paymentMethod: string;
  cashFlowMode?: 'CASH_ON_PICK' | 'MERCHANT_CREDIT';
  pickupPaymentStatus?: string;
  pickupPaymentAmount?: number;
  pickupPaymentConfirmedAt?: string;
  user: { id: string; name: string; phoneNumber: string };
  rider?: { id: string; name: string; phoneNumber: string };
  address: { streetAddress: string; city: string };
  items: OrderItem[];
  orderType: string; martId?: string;
  subOrders?: { id: string; status: string; subtotal?: number; pickupPaymentStatus?: string; pickupPaymentAmount?: number; pickupPaymentConfirmedAt?: string; restaurantId: string; restaurant?: { name: string; location: string; zoneId?: string } }[];
  orderHistory?: { id: string; status: string; notes: string; createdAt: string }[];
  releaseCount?: number;
  discountAmount?: number;
  couponCode?: string;
}

const API_URL         = `${BASE_URL}/orders/all`;
const ZONES_URL       = `${BASE_URL}/delivery-zones/all`;
const STATUS_UPDATE_URL = (id: string) => `${BASE_URL}/orders/${id}/status`;

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'INSTABILITY'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-purple',
    out_for_delivery: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red',
  };
  return <span className={map[status.toLowerCase()] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
}

function CashFlowBadge({ mode }: { mode?: string }) {
  if (mode === 'MERCHANT_CREDIT') {
    return <span className="badge-blue text-[9px]">Credit Order</span>;
  }
  return <span className="badge-green text-[9px]">Cash on Pick</span>;
}

const calcDist = (la1: number, lo1: number, la2: number, lo2: number) => {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function OrdersPage() {
  const [orders,        setOrders]       = useState<Order[]>([]);
  const [riders,        setRiders]       = useState<any[]>([]);
  const { settings } = useSettings();
  const { loading, setLoading, setError } = useAsyncData();
  const [filter,        setFilter]       = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedZone,  setSelectedZone] = useState('all');
  const [zones,         setZones]        = useState<any[]>([]);
  const [martLocations, setMartLocations]= useState<any[]>([]);
  const [searchTerm,    setSearchTerm]   = useState('');
  const [selectedOrder, setSelectedOrder]= useState<Order | null>(null);
  const [page,          setPage]         = useState(1);
  const [limit]                          = useState(20);
  const [totalOrders,   setTotalOrders]  = useState(0);

  useEffect(() => { fetchRiders(); fetchZones(); }, []);
  useEffect(() => { void fetchOrders(page); }, [page]);

  useEffect(() => {
    const onRefresh = () => { void fetchOrders(page); };
    window.addEventListener('refreshOrders', onRefresh);
    return () => window.removeEventListener('refreshOrders', onRefresh);
  }, [page]);
  
  useEffect(() => {
    if (page !== 1) setPage(1);
    else void fetchOrders(1);
  }, [selectedModule, filter, selectedZone]);

  const fetchZones = async () => {
    try {
      const res = await fetchWithAuth(ZONES_URL);
      if (res.ok) setZones(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (settings.mart_locations_list) {
      const raw = settings.mart_locations_list;
      setMartLocations(typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []));
    }
  }, [settings]);

  const fetchRiders = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/riders/all`);
      if (res.ok) {
        const body = await res.json();
        setRiders(body.filter((r: any) => r.isActive && r.isProfileComplete));
      }
    } catch { /* silent */ }
  };

  const fetchOrders = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (selectedModule !== 'ALL') params.append('orderType', selectedModule.toLowerCase());
      if (filter !== 'ALL') params.append('status', filter.toLowerCase());
      if (selectedZone !== 'all') params.append('zoneId', selectedZone);

      const res = await fetchWithAuth(`${API_URL}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalOrders(Number(data.total || 0));
        setPage(Number(data.page || targetPage));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(STATUS_UPDATE_URL(orderId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) {
        setOrders(o => o.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
        if (selectedOrder?.id === orderId) setSelectedOrder(s => s ? { ...s, status: newStatus } : s);
        showToast({ title: `Order ${newStatus.replace(/_/g, ' ')}`, variant: 'success' });
      }
    } catch (err) { console.error(err); }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/orders/${orderId}/assign`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riderId }) });
      if (res.ok) {
        const updated = await res.json();
        const fullRider = riders.find(r => r.id === riderId);
        setOrders(o => o.map(x => x.id === orderId ? { ...x, status: updated.status, rider: fullRider || x.rider } : x));
        if (selectedOrder?.id === orderId) setSelectedOrder(s => s ? { ...s, status: updated.status, rider: fullRider || s.rider } : s);
        showToast({ title: 'Rider Dispatched', variant: 'success' });
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-container h-full flex flex-col gap-10 !pb-0 overflow-hidden">
      
      {/* ─── Level 1: Terminal Header ───────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 shrink-0">
         <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-12 h-1 bg-indigo-600 rounded-full" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Operations Unit</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Order<br/>Architecture</h1>
         </div>

         <div className="flex flex-wrap items-center gap-4 p-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="relative group max-w-xs">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
               <input 
                 type="text" 
                 placeholder="Search transmissions..." 
                 className="input pl-14 w-72 !border-none !bg-transparent"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <select 
              className="bg-transparent px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="all">Global Zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <button 
              onClick={() => fetchOrders(page)}
              className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
         </div>
      </div>

      {/* ─── Level 2: Control Matrix ───────────────────── */}
      <div className="flex flex-col md:flex-row gap-6 shrink-0">
          <div className="flex bg-slate-900/5 p-1 rounded-[2rem] border border-slate-100 shadow-inner">
            {[
              { id: 'ALL', label: 'Global', icon: Package },
              { id: 'food', label: 'Dining', icon: UtensilsCrossed },
              { id: 'mart', label: 'Mart', icon: ShoppingBag },
              { id: 'pharma', label: 'Pharma', icon: Pill },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedModule(tab.id)}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedModule === tab.id 
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 translate-y-[-2px]' 
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50'
                }`}
              >
                <tab.icon size={14} /> <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  filter === f 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                }`}
              >
                {f === 'INSTABILITY' ? '⚠️ High Risk' : f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
      </div>

      {/* ─── Level 3: Dual-Pane Operations ───────────────────── */}
      <div className="flex-1 flex gap-10 min-h-0 pb-8">
          
          {/* Order Stream Lane */}
          <div className={`flex flex-col min-h-0 transition-all duration-700 ease-out ${selectedOrder ? 'w-[45%]' : 'w-full'}`}>
              <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                  {loading && orders.length === 0 ? (
                    <div className="py-20 flex flex-col items-center opacity-40"><RefreshCw className="animate-spin text-indigo-500 mb-6" size={48} /><p className="text-[10px] font-black uppercase tracking-[0.5em]">Syncing Feed...</p></div>
                  ) : orders.length === 0 ? (
                    <div className="py-32 flex flex-col items-center opacity-20 border-2 border-dashed border-slate-100 rounded-[3rem]"><Package size={64} className="mb-6" /><p className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Empty</p></div>
                  ) : (
                    orders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`group relative p-10 rounded-[3rem] border transition-all cursor-pointer overflow-hidden ${
                          selectedOrder?.id === order.id 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-[0_40px_80px_rgba(15,23,42,0.25)]' 
                            : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-slate-200/40 hover:-translate-y-2'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                           <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                 <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedOrder?.id === order.id ? 'text-white/40' : 'text-slate-300'}`}>TXN://{order.id.slice(0, 8).toUpperCase()}</span>
                                 <StatusBadge status={order.status} />
                                 <CashFlowBadge mode={order.cashFlowMode || 'CASH_ON_PICK'} />
                              </div>
                              <h4 className={`text-2xl font-black italic uppercase tracking-tighter leading-none ${selectedOrder?.id === order.id ? 'text-white' : 'text-slate-800'}`}>{order.user?.name || 'Anonymous Entity'}</h4>
                              <div className={`flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-white/60' : 'text-slate-400'}`}>
                                 <Zap size={12} className={selectedOrder?.id === order.id ? 'text-indigo-400' : 'text-indigo-600'} />
                                 {order.orderType} hub
                                 <div className="w-1 h-1 rounded-full bg-slate-300" />
                                 {format(new Date(order.createdAt), 'HH:mm:ss')}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={`text-3xl font-black tracking-tighter italic ${selectedOrder?.id === order.id ? 'text-indigo-400' : 'text-slate-900'}`}>Rs. {Number(order.total).toLocaleString()}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${selectedOrder?.id === order.id ? 'text-white/40' : 'text-slate-300'}`}>{order.items?.length || 0} Resource Units</p>
                           </div>
                        </div>
                        
                        {order.releaseCount && order.releaseCount >= 3 && (
                           <div className="mt-8 flex items-center gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem]">
                              <Activity size={16} className="text-rose-500" />
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic leading-none">Security Risk: Released {order.releaseCount} times</span>
                           </div>
                        )}
                      </div>
                    ))
                  )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-indigo-600" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{totalOrders} Processed</p>
                 </div>
                 <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
          </div>

          {/* Tactical Intel Expansion */}
          {selectedOrder && (
            <div className="flex-1 card !p-0 !rounded-[4rem] bg-white border-slate-100 shadow-[0_50px_100px_rgba(79,70,229,0.12)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-10 duration-700">
               <div className="p-12 pb-0 flex items-center justify-between shrink-0">
                  <div className="space-y-4">
                     <div className="flex items-center gap-3 text-indigo-600">
                        <Zap size={20} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Tactical Intelligence</span>
                     </div>
                     <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Unit Details</h2>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="w-16 h-16 flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-[2rem] transition-all"><X size={28} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                  
                  {/* Status Protocols */}
                  <div className="grid grid-cols-2 gap-4">
                     {[
                       {s:'confirmed', l:'Authorize', c:'bg-emerald-50 text-emerald-600 border-emerald-100'},
                       {s:'out_for_delivery', l:'Dispatch', c:'bg-indigo-600 text-white shadow-xl shadow-indigo-200'},
                       {s:'delivered', l:'Archive', c:'bg-slate-900 text-white shadow-xl shadow-slate-400/20'},
                       {s:'cancelled', l:'Decommission', c:'bg-rose-50 text-rose-600 border-rose-100'}
                     ].map(act => (
                       <button
                         key={act.s}
                         onClick={() => handleUpdateStatus(selectedOrder.id, act.s)}
                         className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${act.c}`}
                       >
                         {act.l} Protocol
                       </button>
                     ))}
                  </div>

                  {/* Geospatial & Logistic Mapping */}
                  <div className="grid grid-cols-2 gap-10">
                     <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16" />
                        <div className="relative space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 backdrop-blur-xl">
                                 <User size={24} className="text-indigo-400" />
                              </div>
                              <div>
                                 <p className="text-xl font-black uppercase italic tracking-tight leading-none">{selectedOrder.user?.name || 'Unknown Entity'}</p>
                                 <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2 tracking-[0.2em]">Authorized User</p>
                              </div>
                           </div>
                           <div className="space-y-4 pt-4">
                              <div className="flex items-start gap-4">
                                 <MapPin size={16} className="text-indigo-400 shrink-0 mt-1" />
                                 <p className="text-xs font-bold leading-relaxed text-white/70">{selectedOrder.address?.streetAddress}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                 <Phone size={16} className="text-emerald-400 shrink-0" />
                                 <p className="text-sm font-black tracking-[0.2em]">{selectedOrder.user?.phoneNumber}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white border-2 border-slate-100 p-10 rounded-[3rem] space-y-8 flex flex-col justify-between">
                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                 <Bike size={24} />
                              </div>
                              <div>
                                 <p className="text-lg font-black uppercase tracking-tighter">{selectedOrder.rider?.name || 'Logistic Node Offline'}</p>
                                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Personnel Tracking</p>
                              </div>
                           </div>
                        </div>
                        <select 
                          className="input w-full !bg-slate-50 border-none"
                          value={selectedOrder.rider?.id || ''} 
                          onChange={(e) => handleAssignRider(selectedOrder.id, e.target.value)}
                        >
                           <option value="">Map Dispatch Link...</option>
                           {riders.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* Payload Manifest Terminal */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-3">
                        <Package size={20} className="text-slate-300" />
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Resource Payload Manifest</h5>
                     </div>
                     <div className="space-y-4">
                        {selectedOrder.items?.map(item => (
                           <div key={item.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all hover:shadow-xl hover:shadow-slate-200/40">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 overflow-hidden p-2 shadow-sm">
                                    <img 
                                      src={normalizeUrl(item.menuItem?.imageUrl || item.product?.imageUrl || item.medicine?.imageUrl || '')} 
                                      alt="" 
                                      className="w-full h-full object-contain"
                                      onError={(e) => { (e.target as any).src = 'https://placehold.co/100x100?text=Item'; }}
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-black uppercase italic tracking-tight">{item.product?.name || item.medicine?.name || item.menuItem?.name || 'Resource Unit'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">QTY: {item.quantity} · Price: RS. {item.priceAtTime}</p>
                                 </div>
                              </div>
                              <p className="text-lg font-black text-slate-900 tracking-tighter italic">RS. {(Number(item.quantity) * Number(item.priceAtTime)).toLocaleString()}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Final Settlement Logic */}
                  <div className="p-10 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 space-y-6 relative overflow-hidden">
                     <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />
                     <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase tracking-[0.3em]">
                        <span>Primary Resource Total</span>
                        <span>Rs. {Number(selectedOrder.subtotal).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase tracking-[0.3em]">
                        <span>Logistic Protocol Fee</span>
                        <span>Rs. {Number(selectedOrder.deliveryFee).toLocaleString()}</span>
                     </div>
                     {Number(selectedOrder.discountAmount) > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                           <span>Voucher Savings ({selectedOrder.couponCode})</span>
                           <span>- Rs. {Number(selectedOrder.discountAmount).toLocaleString()}</span>
                        </div>
                     )}
                     <div className="pt-6 border-t border-white/20 flex justify-between items-end">
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">Settlement Total</span>
                           <h4 className="text-5xl font-black italic tracking-tighter">RS. {Number(selectedOrder.total).toLocaleString()}</h4>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                           <ArrowRight size={14} className="text-indigo-400" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{selectedOrder.paymentMethod}</span>
                        </div>
                     </div>
                  </div>

                  {/* Cash Flow & Pickup Audit */}
                  <div className="p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-amber-600" />
                      <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.3em]">Cash Flow Audit</h5>
                      <CashFlowBadge mode={selectedOrder.cashFlowMode || 'CASH_ON_PICK'} />
                    </div>
                    {selectedOrder.subOrders && selectedOrder.subOrders.length > 0 ? (
                      selectedOrder.subOrders.map(sub => (
                        <div key={sub.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-amber-100">
                          <div>
                            <p className="text-xs font-black text-slate-800">{sub.restaurant?.name || 'Shop'}</p>
                            <p className="text-[10px] text-slate-400 uppercase">
                              Subtotal Rs. {Number(sub.subtotal || 0).toLocaleString()}
                              {sub.pickupPaymentAmount != null && ` · Paid Rs. ${Number(sub.pickupPaymentAmount).toLocaleString()}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${sub.pickupPaymentStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {sub.pickupPaymentStatus === 'confirmed' ? 'Shop Paid' : 'Pending'}
                            </span>
                            {sub.pickupPaymentConfirmedAt && (
                              <p className="text-[9px] text-slate-400 mt-1">{format(new Date(sub.pickupPaymentConfirmedAt), 'MMM dd, HH:mm')}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-amber-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">Single-stop pickup</p>
                          <p className="text-[10px] text-slate-400 uppercase">
                            Subtotal Rs. {Number(selectedOrder.subtotal).toLocaleString()}
                            {selectedOrder.pickupPaymentAmount != null && ` · Paid Rs. ${Number(selectedOrder.pickupPaymentAmount).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="text-right">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${selectedOrder.pickupPaymentStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {selectedOrder.pickupPaymentStatus === 'confirmed' ? 'Shop Paid' : 'Pending'}
                        </span>
                        {selectedOrder.pickupPaymentConfirmedAt && (
                          <p className="text-[9px] text-slate-400 mt-1">{format(new Date(selectedOrder.pickupPaymentConfirmedAt), 'MMM dd, HH:mm')}</p>
                        )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activity Log System */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-3">
                        <Activity size={20} className="text-slate-300" />
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Execution Timeline</h5>
                     </div>
                     <div className="space-y-6 pl-6 border-l-2 border-slate-50 ml-2">
                        {[...(selectedOrder.orderHistory || [])].reverse().map((evt) => (
                           <div key={evt.id} className="relative group">
                              <div className="absolute -left-[1.95rem] top-2 w-3.5 h-3.5 rounded-full bg-slate-200 border-4 border-white shadow-sm group-hover:bg-indigo-600 group-hover:scale-125 transition-all" />
                              <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{evt.status.replace(/_/g, ' ')}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(evt.createdAt), 'MMM dd, HH:mm:ss')}</span>
                                 </div>
                                 {evt.notes && <p className="text-[11px] font-bold text-slate-500 italic opacity-60">"Protocol Note: {evt.notes}"</p>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}
      </div>
    </div>
  );
}
