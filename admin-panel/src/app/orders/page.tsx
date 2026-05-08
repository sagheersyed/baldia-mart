'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Eye, Clock, CheckCircle, Truck, XCircle,
  Package, MapPin, Phone, User, Bike, RefreshCw, X, ChevronDown,
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

interface OrderItem {
  id: string; quantity: number; priceAtTime: number; status: string;
  product: { id: string; name: string; imageUrl: string };
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

  useEffect(() => { fetchRiders(); fetchZones(); fetchSettings(); }, []);
  useEffect(() => { void fetchOrders(page); }, [page]);
  useEffect(() => {
    const t = setInterval(() => void fetchOrders(page), 30000);
    const handleRefresh = () => void fetchOrders(page);
    if (typeof window !== 'undefined') {
      window.addEventListener('refreshOrders', handleRefresh);
    }
    return () => {
      clearInterval(t);
      if (typeof window !== 'undefined') window.removeEventListener('refreshOrders', handleRefresh);
    };
  }, [page]);

  const fetchZones = async () => {
    try {
      const res = await fetchWithAuth(ZONES_URL);
      if (res.ok) setZones(await res.json());
    } catch { /* silent */ }
  };

  const fetchSettings = async () => {
    try {
      const res  = await fetchWithAuth(SETTINGS_URL);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray((data as any).data) ? (data as any).data : []);
      const raw  = list.find((s: any) => s.key === 'mart_locations_list')?.value || '[]';
      setMartLocations(typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []));
    } catch { /* silent */ }
  };

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
      setError(getErrorMessage(err, 'Failed to fetch orders'));
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
      } else {
        showToast({ title: await parseApiError(res, 'Failed to update status'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update status'), variant: 'error' });
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
        showToast({ title: 'Rider assigned', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to assign rider'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to assign rider'), variant: 'error' });
    }
  };

  const getOrderZoneId = (order: Order): string | null => {
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
    if ((order as any).address?.latitude && (order as any).address?.longitude) {
      const z = zones.find(z => calcDist(Number((order as any).address.latitude), Number((order as any).address.longitude), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm));
      if (z) return z.id;
    }
    return null;
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'INSTABILITY') return (o.releaseCount || 0) >= 3;
    const matchF = filter === 'ALL' || o.status.toUpperCase() === filter;
    const matchZ = selectedZone === 'all' || getOrderZoneId(o) === selectedZone;
    const matchS = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || (o.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchF && matchZ && matchS;
  });

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col gap-5">
      {/* Header */}
      <div className="page-header mb-0">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Monitor and manage customer orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" placeholder="Search order or customer…" className="input pl-9 w-56" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="input w-auto" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
            <option value="all">All Zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <button onClick={() => fetchOrders(page)} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === f ? (f === 'INSTABILITY' ? 'bg-red-600 text-white' : 'bg-primary-600 text-white') : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-5 min-h-0">
        {/* Orders list */}
        <div className={`card flex flex-col overflow-hidden transition-all duration-300 ${selectedOrder ? 'w-1/2' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-3">
            {loading && orders.length === 0 ? (
              <LoadingState message="Loading orders…" />
            ) : error ? (
              <ErrorState message={error} onRetry={() => fetchOrders(page)} />
            ) : filteredOrders.length === 0 ? (
              <EmptyState title="No orders found" message="Try adjusting filters or search." icon={<Package size={22} className="text-slate-300" />} />
            ) : (
              <div className="space-y-2">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="font-semibold text-slate-800">{order.user?.name || 'Anonymous'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">Rs. {Number(order.total || 0).toFixed(0)}</p>
                        <p className="text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <StatusBadge status={order.status} />
                      {order.releaseCount && order.releaseCount > 0 ? (
                        <span className={`badge ${order.releaseCount >= 3 ? 'badge-red' : 'badge-orange'}`}>
                          <Bike size={10} /> Released ×{order.releaseCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Page {page} / {totalPages}</span>
              <span>{totalOrders} total</span>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        {/* Order details panel */}
        {selectedOrder && (
          <div className="w-1/2 card flex flex-col overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-slate-800">Order Details</h2>
                <p className="text-xs text-slate-400">#{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn-ghost btn-icon"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status actions */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['confirmed', 'Confirm', 'btn-accent'], ['out_for_delivery', 'Dispatch', 'btn-ghost'], ['delivered', 'Force Deliver', 'btn-success'], ['cancelled', 'Cancel', 'btn-danger']].map(([s, label, cls]) => (
                    <button key={s} onClick={() => handleUpdateStatus(selectedOrder.id, s)} className={`btn ${cls} text-xs justify-center py-2`}>{label}</button>
                  ))}
                </div>
                {selectedOrder.releaseCount && selectedOrder.releaseCount > 0 ? (
                  <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 ${selectedOrder.releaseCount >= 3 ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                    <Bike size={14} />
                    <p className="text-xs font-semibold">Released {selectedOrder.releaseCount} times — investigate logistics</p>
                  </div>
                ) : null}
              </div>

              {/* Customer & Rider */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5 flex items-center gap-1"><User size={10} /> Customer</p>
                  <p className="font-semibold text-slate-800 text-sm">{selectedOrder.user?.name || 'Anonymous'}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {selectedOrder.user?.phoneNumber || '—'}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1.5 flex items-center gap-1"><Bike size={10} /> Rider</p>
                  {selectedOrder.rider ? (
                    <>
                      <p className="font-semibold text-slate-800 text-sm">{selectedOrder.rider.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {selectedOrder.rider.phoneNumber || '—'}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Not assigned</p>
                  )}
                </div>
              </div>

              {/* Rider assignment */}
              {['pending', 'confirmed'].includes(selectedOrder.status.toLowerCase()) && (
                <div>
                  <label className="input-label">Assign Rider</label>
                  <select className="input" value={selectedOrder.rider?.id || ''} onChange={(e) => handleAssignRider(selectedOrder.id, e.target.value)}>
                    <option value="">Select rider…</option>
                    {riders.map(r => <option key={r.id} value={r.id}>{r.name} ({r.vehicleNumber}) · {r.isOnline ? '🟢' : '🔴'}</option>)}
                  </select>
                </div>
              )}

              {/* Address */}
              <div>
                <p className="input-label flex items-center gap-1.5"><MapPin size={11} /> Delivery Address</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-sm font-medium text-slate-700">{selectedOrder.address?.streetAddress}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedOrder.address?.city}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="input-label flex items-center gap-1.5"><ShoppingBag size={11} /> Items ({selectedOrder.items?.length || 0})</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                          {item.product?.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-300" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.product?.name || 'Item'}</p>
                          <p className="text-xs text-slate-400">×{item.quantity} @ Rs.{Number(item.priceAtTime || 0).toFixed(0)}</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-slate-800">Rs.{(item.quantity * Number(item.priceAtTime || 0)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="bg-slate-900 text-white rounded-2xl p-4">
                <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rs. {Number(selectedOrder.subtotal || 0).toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>Rs. {Number(selectedOrder.deliveryFee || 0).toFixed(0)}</span></div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-700">
                    <span>Payment</span>
                    <span className="uppercase text-xs font-bold bg-slate-800 px-2 py-0.5 rounded">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-emerald-400">Rs. {Number(selectedOrder.total || 0).toFixed(0)}</span>
                </div>
              </div>

              {/* Timeline */}
              {selectedOrder.orderHistory && selectedOrder.orderHistory.length > 0 && (
                <div>
                  <p className="input-label flex items-center gap-1.5"><Clock size={11} /> Order Timeline</p>
                  <div className="space-y-2">
                    {[...selectedOrder.orderHistory].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 pl-3 relative before:absolute before:left-1 before:top-3 before:bottom-0 before:w-px before:bg-slate-100 last:before:hidden">
                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0 relative z-10" />
                        <div className="flex-1">
                          <span className="badge-blue text-[10px] uppercase">{entry.status.replace(/_/g, ' ')}</span>
                          {entry.notes && <p className="text-xs text-slate-600 mt-0.5">{entry.notes}</p>}
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(entry.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
