'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XOctagon,
  MapPin,
  Phone,
  User,
  Bike,
  Image as ImageIcon,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface RashanOrder {
  id: string;
  rashanStatus: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  rider?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  bulkListText?: string;
  bulkListPhotoUrl?: string;
  bulkMobileNumber: string;
  bulkStreetAddress: string;
  bulkCity: string;
  bulkLandmark?: string;
  bulkFloor: number;
  bulkPlacement: string;
  bulkWeightTier: string;
  estimatedTotal?: number;
  adminRejectionReason?: string;
  isEstimateApproved: boolean;
}

const RASHAN_API = 'http://localhost:3000/api/v1/orders/rashan';
const RASHAN_ADMIN_API = 'http://localhost:3000/api/v1/orders/rashan/all';
const RIDERS_API = 'http://localhost:3000/api/v1/riders/all';

export default function RashanRequestsPage() {
  const [orders, setOrders] = useState<RashanOrder[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RashanOrder | null>(null);
  
  // Action states
  const [productTotal, setProductTotal] = useState('');
  const [deliveryFeeOverride, setDeliveryFeeOverride] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetchWithAuth(RASHAN_ADMIN_API);
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error('Failed to fetch rashan orders', e); }
    finally { setLoading(false); }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetchWithAuth(RIDERS_API);
      if (res.ok) {
        const data = await res.json();
        setRiders(data.filter((r: any) => r.isActive && r.isProfileComplete));
      }
    } catch (e) { console.error('Failed to fetch riders', e); }
  };

  const handleSetQuote = async () => {
    if (!selectedOrder || !productTotal) return;
    setProcessing(true);
    try {
      const res = await fetchWithAuth(`${RASHAN_API}/${selectedOrder.id}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productTotal: Number(productTotal),
          deliveryFeeOverride: deliveryFeeOverride ? Number(deliveryFeeOverride) : undefined
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        setProductTotal('');
        setDeliveryFeeOverride('');
        alert('Quotation sent to user!');
      }
    } catch (e) { alert('Failed to set quote'); }
    finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason) return;
    setProcessing(true);
    try {
      const res = await fetchWithAuth(`${RASHAN_API}/${selectedOrder.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        setRejectionReason('');
        alert('Order rejected.');
      }
    } catch (e) { alert('Failed to reject order'); }
    finally { setProcessing(false); }
  };

  const handleMarkSourcing = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const res = await fetchWithAuth(`${RASHAN_API}/${selectedOrder.id}/sourcing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: selectedRiderId || undefined }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        alert('Order moved to Sourcing phase!');
      }
    } catch (e) { alert('Failed to update status'); }
    finally { setProcessing(false); }
  };

  const handleDeliver = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const res = await fetchWithAuth(`${RASHAN_API}/${selectedOrder.id}/delivered`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        alert('Order marked as Delivered!');
      }
    } catch (e) { alert('Failed to update status'); }
    finally { setProcessing(false); }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'ALL' || o.rashanStatus.toUpperCase() === filter;
    const matchesSearch = o.id.includes(searchTerm) || o.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRashanStatusBadge = (status: string) => {
    const styles: any = {
      pending_review: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      quoted: 'bg-blue-50 text-blue-600 border-blue-200',
      approved: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      sourcing: 'bg-orange-50 text-orange-600 border-orange-200',
      delivered: 'bg-green-50 text-green-600 border-green-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
    };
    const style = styles[status] || 'bg-gray-50 text-gray-600 border-gray-200';
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-screen flex flex-col animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            <Package className="mr-3 text-primary" size={36} /> 
            Rashan Requests
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Monthly Bulk Grocery Service Management</p>
        </div>

        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by ID or Customer..."
              className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white rounded-2xl border border-gray-100 p-1 shadow-sm">
            {['ALL', 'PENDING_REVIEW', 'QUOTED', 'APPROVED', 'SOURCING', 'DELIVERED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                {f.split('_')[0]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex gap-8">
        {/* List */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col ${selectedOrder ? 'w-2/5' : 'w-full'} transition-all duration-300 overflow-hidden`}>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package size={64} className="mb-4 opacity-20" />
                <p className="font-bold">No requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'bg-primary/5 border-primary shadow-inner scale-[0.98]' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-lg hover:scale-[1.01]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 block mb-1">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <h4 className="font-extrabold text-gray-900 leading-tight">{order.user.name}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-bold text-gray-400 mb-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                         {getRashanStatusBadge(order.rashanStatus)}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 font-bold mt-3">
                       <MapPin size={12} className="mr-1 text-primary" /> {order.bulkCity} 
                       <span className="mx-2 opacity-20">|</span>
                       <ImageIcon size={12} className="mr-1 text-blue-500" /> {order.bulkListPhotoUrl ? 'Photo attached' : 'Text list only'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        {selectedOrder && (
          <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/60 border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-500">
            <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Request Details</h2>
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">#{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all border border-gray-100 shadow-sm"
              >
                <XOctagon size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {/* Critical Workflow Actions */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                   <AlertCircle size={14} className="mr-2" /> Action Required
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quote Step */}
                  {selectedOrder.rashanStatus === 'pending_review' && (
                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-4 col-span-2">
                      <p className="font-black text-blue-900 text-sm">Issue Price Quotation</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-400 uppercase">1. Product Total (Sodai)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                            <input 
                               type="number" 
                               placeholder="Product Price"
                               className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                               value={productTotal}
                               onChange={(e) => setProductTotal(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-400 uppercase">2. Logistics Fee (Service)</label>
                          <div className="relative">
                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                            <input 
                               type="number" 
                               placeholder={`Current: Rs. ${selectedOrder.deliveryFee}`}
                               className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                               value={deliveryFeeOverride}
                               onChange={(e) => setDeliveryFeeOverride(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-600/10 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-black text-blue-900 uppercase">Final Total to User:</span>
                        <span className="text-xl font-black text-blue-600">
                          Rs. {(Number(productTotal || 0) + Number(deliveryFeeOverride || selectedOrder.deliveryFee || 0)).toLocaleString()}
                        </span>
                      </div>

                      <button 
                         disabled={processing || !productTotal}
                         onClick={handleSetQuote}
                         className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                      >
                         Send Quotation to User
                      </button>
                    </div>
                  )}

                  {/* Reject Step */}
                  {['pending_review', 'quoted'].includes(selectedOrder.rashanStatus) && (
                    <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 space-y-4">
                      <p className="font-black text-red-900 text-sm">Reject Request</p>
                      <textarea 
                         placeholder="Reason for rejection..."
                         className="w-full p-4 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-sm"
                         rows={2}
                         value={rejectionReason}
                         onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <button 
                         disabled={processing || !rejectionReason}
                         onClick={handleReject}
                         className="w-full py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                         Reject Order
                      </button>
                    </div>
                  )}

                  {/* Sourcing Step */}
                  {selectedOrder.rashanStatus === 'approved' && (
                    <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 space-y-4 col-span-2">
                       <p className="font-black text-orange-900 text-sm">Move to Sourcing Phase</p>
                       <div className="flex gap-3">
                          <select 
                             className="flex-1 p-3 rounded-xl border border-orange-200 focus:outline-none font-bold text-sm bg-white"
                             value={selectedRiderId}
                             onChange={(e) => setSelectedRiderId(e.target.value)}
                          >
                             <option value="">Optional: Assign Rider Now</option>
                             {riders.map(r => (
                               <option key={r.id} value={r.id}>{r.name} ({r.isOnline ? 'Online' : 'Offline'})</option>
                             ))}
                          </select>
                          <button 
                             disabled={processing}
                             onClick={handleMarkSourcing}
                             className="px-8 py-3 bg-orange-600 text-white rounded-xl font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                          >
                             Start Sourcing
                          </button>
                       </div>
                    </div>
                  )}

                  {/* Complete Step */}
                  {selectedOrder.rashanStatus === 'sourcing' && (
                    <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100 space-y-4 col-span-2">
                        <p className="font-black text-green-900 text-sm">Delivery Confirmation</p>
                        <button 
                           disabled={processing}
                           onClick={handleDeliver}
                           className="w-full py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-100 flex items-center justify-center"
                        >
                           <Truck className="mr-2" /> Mark as Delivered
                        </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Context */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Customer Details</h3>
                   <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-lg font-black text-gray-900">{selectedOrder.user.name}</p>
                      <p className="text-sm font-bold text-primary mt-1 flex items-center"><Phone size={14} className="mr-2" /> {selectedOrder.bulkMobileNumber}</p>
                   </div>
                   
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-8 mb-4">Logistics Requirements</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                         <p className="text-[10px] font-black text-gray-400 uppercase">Weight</p>
                         <p className="font-extrabold text-gray-900">{selectedOrder.bulkWeightTier.toUpperCase()}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                         <p className="text-[10px] font-black text-gray-400 uppercase">Floor</p>
                         <p className="font-extrabold text-gray-900">{selectedOrder.bulkFloor === 0 ? 'Ground' : `${selectedOrder.bulkFloor}`}</p>
                      </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Delivery Address</h3>
                   <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 h-full">
                      <p className="font-black text-gray-900 leading-relaxed">{selectedOrder.bulkStreetAddress}</p>
                      <p className="text-sm font-bold text-gray-500 mt-2">{selectedOrder.bulkCity}</p>
                      {selectedOrder.bulkLandmark && (
                        <p className="text-xs font-bold text-orange-500 mt-4 flex items-center">
                          <MapPin size={12} className="mr-1" /> Near {selectedOrder.bulkLandmark}
                        </p>
                      )}
                      
                      <div className="mt-6 pt-6 border-t border-gray-200">
                         <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Service Placement</p>
                         <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-700">
                            {selectedOrder.bulkPlacement.toUpperCase()}
                         </span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Product List Content */}
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                   Grocery List 
                   <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full">{selectedOrder.bulkListPhotoUrl ? 'IMAGE & TEXT' : 'TEXT ONLY'}</span>
                </h3>
                
                <div className="space-y-4">
                  {selectedOrder.bulkListPhotoUrl && (
                    <div className="group relative rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-lg">
                      <img 
                        src={selectedOrder.bulkListPhotoUrl} 
                        alt="Grocery List" 
                        className="w-full h-auto max-h-[500px] object-contain bg-gray-50"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={selectedOrder.bulkListPhotoUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white rounded-2xl font-black text-gray-900 shadow-xl scale-90 group-hover:scale-100 transition-transform flex items-center">
                           <Eye className="mr-2" size={20} /> View Full Image
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedOrder.bulkListText && (
                    <div className="bg-orange-50/30 p-8 rounded-[2.5rem] border border-orange-100">
                       <p className="whitespace-pre-wrap text-lg font-bold text-gray-700 leading-loose italic">
                          "{selectedOrder.bulkListText}"
                       </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Status Summary */}
              <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-400">
                 <div className="flex justify-between items-center">
                    <div>
                       <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">Financial Status</p>
                       <p className="text-2xl font-black text-primary">
                          {selectedOrder.rashanStatus === 'pending_review' ? 'Awaiting Quote' : `Rs. ${selectedOrder.total.toLocaleString()}`}
                       </p>
                    </div>
                    {selectedOrder.isEstimateApproved && (
                      <div className="bg-green-500/20 px-4 py-2 rounded-2xl border border-green-500/40 flex items-center">
                         <CheckCircle className="text-green-500 mr-2" size={18} />
                         <span className="text-xs font-black text-green-500">QUOTATION APPROVED BY USER</span>
                      </div>
                    )}
                 </div>
                 
                 {selectedOrder.total > 0 && (
                   <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 gap-4">
                      <div className="text-sm font-bold text-gray-400 flex flex-col">
                         <span>Financial Breakdown:</span>
                         <span className="text-white text-sm">Products: Rs. {Number(selectedOrder.subtotal).toLocaleString()}</span>
                         <span className="text-white text-sm">Logistics: Rs. {Number(selectedOrder.deliveryFee).toLocaleString()}</span>
                         <span className="text-primary text-lg font-black mt-2">Total: Rs. {Number(selectedOrder.total).toLocaleString()}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-400 flex flex-col text-right">
                         <span>Payment Mode:</span>
                         <span className="text-primary text-lg uppercase">Cash on Delivery</span>
                      </div>
                   </div>
                 )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
