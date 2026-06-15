'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Eye, Clock, CheckCircle, Truck, XCircle,
  Package, MapPin, Phone, User, Bike, RefreshCw, X, ChevronDown,
  FileText, ExternalLink,
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';
import { useSettings } from '@/context/SettingsContext';

interface OrderItem {
  id: string; 
  quantity: number | string; 
  priceAtTime: number | string; 
  status: string;
  product?: { id: string; name: string; imageUrl: string };
  medicine?: { id: string; name: string; imageUrl: string };
  menuItem?: { id: string; name: string; imageUrl: string };
}
interface Order {
  id: string; status: string; total: number; deliveryFee: number; subtotal: number;
  notes?: string; createdAt: string; paymentMethod: string;
  user: { id: string; name: string; phoneNumber: string };
  rider?: { id: string; name: string; phoneNumber: string };
  address: { streetAddress: string; city: string };
  items: OrderItem[];
  orderType: string; martId?: string;
  subOrders?: { id: string; status: string; restaurantId: string; restaurant?: { name: string; location: string; zoneId?: string } }[];
  orderHistory?: { id: string; status: string; notes: string; createdAt: string }[];
  releaseCount?: number;
}

const API_URL         = `${BASE_URL}/orders/all`;
const ZONES_URL       = `${BASE_URL}/delivery-zones/all`;
const SETTINGS_URL    = `${BASE_URL}/settings/public`;
const STATUS_UPDATE_URL = (id: string) => `${BASE_URL}/orders/${id}/status`;

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'INSTABILITY'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-purple',
    out_for_delivery: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red',
  };
  return <span className={map[status.toLowerCase()] ?? 'badge-gray'}>{status.replace(/_/g, ' ')}</span>;
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
  const { loading, error, setLoading, setError } = useAsyncData();
  const [filter,        setFilter]       = useState('ALL');
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
      setLoading(true); setError(null);
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      const res = await fetchWithAuth(`${API_URL}?${params}`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch orders'));
      const data = await res.json();
      setOrders(data.data || []);
      setTotalOrders(Number(data.total || 0));
      setPage(Number(data.page || targetPage));
    } catch (err) {
      setError(getErrorMessage(err, 'Platform sync failed'));
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(STATUS_UPDATE_URL(orderId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) {
        setOrders(o => o.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
        if (selectedOrder?.id === orderId) setSelectedOrder(s => s ? { ...s, status: newStatus } : s);
        showToast({ title: `Order ${newStatus.toLowerCase()}`, variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Protocol failure'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Transmission error'), variant: 'error' });
    }
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
        showToast({ title: 'Logistics asset assigned', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Assignment failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Rider sync error'), variant: 'error' });
    }
  };

  const getOrderZoneId = React.useCallback((order: Order): string | null => {
    if (order.subOrders?.length) {
      const z = (order.subOrders[0] as any).restaurant?.zoneId;
      if (z) return z;
    }
    if (order.orderType === 'mart' && (order as any).martId) {
      const mart = martLocations.find(m => m.id === (order as any).martId);
      if (mart?.lat && mart?.lng) {
        const z = zones.find(z => calcDist(Number(mart.lat), Number(mart.lng), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm));
        if (z) return z.id;
      }
    }
    return null;
  }, [martLocations, zones]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      if (filter === 'INSTABILITY') return (o.releaseCount || 0) >= 3;
      const matchF = filter === 'ALL' || o.status.toUpperCase() === filter;
      const matchZ = selectedZone === 'all' || getOrderZoneId(o) === selectedZone;
      const matchS = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || (o.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchF && matchZ && matchS;
    });
  }, [orders, filter, selectedZone, searchTerm, getOrderZoneId]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-8 pb-4">
      {/* Strategic Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2 border-b border-slate-100/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
               <Package size={24} className="text-primary-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Logistics Deck</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Real-time Order Flow · Tactical Rejection Analysis</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="relative group max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search transmission ID..." 
                className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex bg-white/50 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200">
              <select 
                className="px-6 py-2 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-slate-500 hover:text-slate-900"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="all">Global Zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
           </div>

           <button 
             onClick={() => fetchOrders(page)}
             className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
           >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide shrink-0">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
              filter === f 
                ? (f === 'INSTABILITY' ? 'bg-rose-500 text-white border-rose-600 shadow-rose-200' : 'bg-slate-900 text-white border-slate-950 shadow-slate-200') 
                : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200'
            }`}
          >
            {f === 'INSTABILITY' ? '⚠️ High Risk' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Multi-Pane Operations */}
      <div className="flex-1 min-h-0 flex gap-8">
        {/* Stream Pane */}
        <div className={`flex flex-col min-h-0 transition-all duration-500 ease-out ${selectedOrder ? 'w-[45%]' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {loading && orders.length === 0 ? (
              <div className="py-20 flex flex-col items-center"><RefreshCw className="animate-spin text-primary-500 mb-6" size={48} /><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Syncing Stream...</p></div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-32 flex flex-col items-center opacity-40"><Package size={64} className="text-slate-200 mb-6" /><p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">No active transmissions</p></div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`group relative p-8 rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden ${
                    selectedOrder?.id === order.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/30' 
                      : 'bg-white border-slate-100/60 hover:border-primary-200 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1.5'
                  }`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-white/40' : 'text-slate-300'}`}>TXN ID · {order.id.slice(0, 8).toUpperCase()}</p>
                      <h4 className={`text-xl font-black tracking-tight italic ${selectedOrder?.id === order.id ? 'text-white' : 'text-slate-800'}`}>{order.user?.name || 'External Entity'}</h4>
                      <p className={`text-[10px] font-bold ${selectedOrder?.id === order.id ? 'text-white/60' : 'text-slate-400'} uppercase`}>{order.orderType} Transmission · {format(new Date(order.createdAt), 'HH:mm:ss')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black tracking-tighter ${selectedOrder?.id === order.id ? 'text-primary-400' : 'text-slate-900'}`}>RS. {Number(order.total || 0).toLocaleString()}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  
                  {order.releaseCount && order.releaseCount >= 3 && (
                     <div className="mt-6 flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-pulse">
                        <XCircle size={14} className="text-rose-500" />
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Logistic Failure: Released {order.releaseCount} times</span>
                     </div>
                  )}
                  
                  <div className={`absolute bottom-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-5 transition-opacity bg-primary-500`} />
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalOrders} Transmissions Processed</p>
             <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        {/* Tactical Intel Pane */}
        {selectedOrder && (
          <div className="flex-1 card !p-0 !rounded-[3.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden animate-slide-up relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 z-0" />
            
            <div className="px-12 py-10 border-b border-slate-50 flex items-center justify-between relative z-10 shrink-0">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Control Panel</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Manual Bypass & Dispatch Protocol</p>
               </div>
               <button 
                 onClick={() => setSelectedOrder(null)} 
                 className="w-14 h-14 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full flex items-center justify-center transition-all hover:rotate-90 active:scale-90"
               >
                 <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative z-10 space-y-12">
               {/* Quick Actions Matrix */}
               <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Protocol</h5>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                     {[
                       {s:'confirmed', l:'Confirm', c:'bg-emerald-50 text-emerald-600 border-emerald-100'},
                       {s:'out_for_delivery', l:'Dispatch', c:'bg-blue-50 text-blue-600 border-blue-100'},
                       {s:'delivered', l:'Finalize', c:'bg-slate-900 text-white border-slate-950'},
                       {s:'cancelled', l:'Abort', c:'bg-rose-50 text-rose-600 border-rose-100'}
                     ].map(act => (
                       <button
                         key={act.s}
                         onClick={() => handleUpdateStatus(selectedOrder.id, act.s)}
                         className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${act.c}`}
                       >
                         {act.l}
                       </button>
                     ))}
                  </div>
               </div>

               {/* Logistics Assets */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Entity Information */}
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Entity & Routing</h5>
                     <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                              <User size={20} className="text-primary-400" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[13px] font-black tracking-tight uppercase italic truncate">{selectedOrder.user?.name || 'Anonymous Entity'}</p>
                              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Status: Verified</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <MapPin size={16} className="text-white/20" />
                              <p className="text-[11px] font-medium text-white/70 leading-relaxed truncate">{selectedOrder.address?.streetAddress}, {selectedOrder.address?.city}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <Phone size={16} className="text-white/20" />
                              <p className="text-[11px] font-black tracking-[0.1em]">{selectedOrder.user?.phoneNumber || 'HIDDEN'}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Rider Dispatch */}
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Logistic Support</h5>
                     <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/20 h-full flex flex-col justify-between">
                        {selectedOrder.rider ? (
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                 <Bike size={24} />
                              </div>
                              <div>
                                 <p className="text-[13px] font-black text-slate-900 uppercase italic leading-tight">{selectedOrder.rider.name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Asset Tracking Active
                                 </p>
                              </div>
                           </div>
                        ) : (
                           <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Awaiting Logistic Assignment</p>
                        )}
                        <div className="mt-8">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Release Dispatch</label>
                           <select 
                             className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary-500/5 transition-all text-slate-600"
                             value={selectedOrder.rider?.id || ''} 
                             onChange={(e) => handleAssignRider(selectedOrder.id, e.target.value)}
                           >
                              <option value="">Manual Override Selection...</option>
                              {riders.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()} · UNIT {r.id.slice(-4).toUpperCase()}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Inventory List */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Payload Manifest</h5>
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{selectedOrder.items?.length || 0} SECTIONS</span>
                  </div>
                  <div className="space-y-3">
                     {selectedOrder.items?.map(item => (
                        <div key={item.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl flex items-center justify-between group transition-all hover:bg-white hover:border-slate-200">
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 overflow-hidden p-2 shadow-sm group-hover:scale-110 transition-transform">
                                 <img src={normalizeUrl(item.product?.imageUrl || item.medicine?.imageUrl || item.menuItem?.imageUrl || '')} alt="" className="w-full h-full object-contain" />
                              </div>
                              <div>
                                 <p className="text-[13px] font-black text-slate-800 uppercase tracking-tighter italic">{item.product?.name || item.medicine?.name || item.menuItem?.name || 'Logistic Unit'}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">QUANTUM: {item.quantity} · VAL: RS.{Number(item.priceAtTime).toLocaleString()} NET</p>
                              </div>
                           </div>
                           <p className="text-lg font-black text-slate-900 tracking-tighter italic">RS.{(Number(item.quantity) * Number(item.priceAtTime)).toLocaleString()}</p>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Financial Reconcilliation */}
               <div className="card !p-12 !bg-slate-950 text-white !rounded-[3rem] shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                  
                  <div className="space-y-6 text-[11px] font-black uppercase tracking-widest relative z-10">
                     <div className="flex justify-between items-center opacity-40">
                        <span>Transmission Subtotal</span>
                        <span className="text-white">RS. {Number(selectedOrder.subtotal).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center opacity-40">
                        <span>Logistic Operational Fee</span>
                        <span className="text-white">RS. {Number(selectedOrder.deliveryFee).toLocaleString()}</span>
                     </div>
                     <div className="pt-6 mt-2 border-t border-white/10 flex justify-between items-center">
                        <span className="text-primary-400 opacity-100">Settlement Total</span>
                        <span className="text-4xl italic tracking-tighter text-white drop-shadow-xl">RS. {Number(selectedOrder.total).toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <div className="mt-10 flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 relative z-10">
                     <RefreshCw size={16} className="text-white/20" />
                     <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-2">Protocol Verified Source</p>
                        <p className="text-[13px] font-black text-white tracking-widest uppercase">{selectedOrder.paymentMethod?.replace(/_/g, ' ') || 'SYSTEM ALLOCATED'}</p>
                     </div>
                  </div>
               </div>

               {/* Strategic Timeline */}
               <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Chronology</h5>
                  <div className="space-y-4 pl-4 border-l-2 border-slate-50 ml-2">
                     {[...(selectedOrder.orderHistory || [])].reverse().map((evt) => (
                        <div key={evt.id} className="relative">
                           <div className="absolute -left-[2.2rem] top-1.5 w-5 h-5 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center shadow-lg">
                              <div className="w-2 h-2 rounded-full bg-slate-900" />
                           </div>
                           <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50 group hover:bg-white hover:border-slate-200 transition-all">
                              <div className="flex justify-between items-center mb-1.5">
                                 <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest italic leading-none">{evt.status.replace(/_/g, ' ')}</span>
                                 <span className="text-[9px] font-black text-slate-300 uppercase leading-none">{format(new Date(evt.createdAt), 'MMM dd | HH:mm')}</span>
                              </div>
                              {evt.notes && <p className="text-[11px] font-medium text-slate-500 italic mt-2 tracking-tight">"{evt.notes}"</p>}
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
