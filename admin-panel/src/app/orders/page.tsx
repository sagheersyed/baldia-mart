'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XOctagon,
  Package,
  MapPin,
  Phone,
  User,
  Bike
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtTime: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  deliveryFee: number;
  subtotal: number;
  createdAt: string;
  paymentMethod: string;
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
  address: {
    streetAddress: string;
    city: string;
  };
  items: OrderItem[];
  subOrders?: {
    id: string;
    status: string;
    restaurantId: string;
    restaurant?: {
      name: string;
      location: string;
    };
  }[];
}

const API_URL = 'http://192.168.100.142:3000/api/v1/orders/all';
const STATUS_UPDATE_URL = (id: string) => `http://192.168.100.142:3000/api/v1/orders/${id}/status`;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
    const interval = setInterval(fetchOrders, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchRiders = async () => {
    try {
      const res = await fetchWithAuth('http://192.168.100.142:3000/api/v1/riders/all');
      if (res.ok) {
        const body = await res.json();
        // Only get active riders with complete profiles
        setRiders(body.filter((r: any) => r.isActive && r.isProfileComplete));
      }
    } catch (e) {
      console.error('Failed to get riders', e);
    }
  };

  const fetchOrders = async () => {
    try {
      // Fetching all orders with Admin Token
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(STATUS_UPDATE_URL(orderId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state immediately
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    try {
      const res = await fetchWithAuth(`http://192.168.100.142:3000/api/v1/orders/${orderId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        const fullRider = riders.find(r => r.id === riderId);

        setOrders(orders.map(o => o.id === orderId ? { ...o, status: updatedOrder.status, rider: fullRider || o.rider } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: updatedOrder.status, rider: fullRider || selectedOrder.rider });
        }
        alert('Rider assigned successfully.');
      } else {
        alert('Failed to assign rider.');
      }
    } catch (error) {
      console.error('Error assigning rider:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'ALL' || order.status.toUpperCase() === filter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
      preparing: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      out_for_delivery: 'bg-purple-50 text-purple-600 border-purple-200',
      delivered: 'bg-green-50 text-green-600 border-green-200',
      cancelled: 'bg-red-50 text-red-600 border-red-200',
    };

    const statusKey = status.toLowerCase() as keyof typeof styles;
    const style = styles[statusKey] || 'bg-gray-50 text-gray-600 border-gray-200';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${style}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto h-screen flex flex-col">
      <header className="mb-8 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Orders</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            Monitor and manage customer orders
          </p>
        </div>

        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by ID or Customer..."
              className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl w-72 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white rounded-2xl border border-gray-100 p-1">
            {['ALL', 'PENDING', 'CONFIRMED', 'DELIVERING', 'DELIVERED', 'CANCELLED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex gap-8">
        {/* Orders List */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col ${selectedOrder ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="flex-1 overflow-y-auto p-4">
            {loading && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <Package className="text-gray-200 mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-400">No orders found</h3>
                <p className="text-gray-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredOrders.map(order => (
                  <li
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'bg-primary/5 border-primary shadow-md' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-black text-gray-400 block mb-1">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <h4 className="font-extrabold text-gray-900">{order.user?.name || 'Anonymous Customer'}</h4>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-primary block">Rs. {Number(order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-500 font-medium flex items-center">
                        <Clock size={12} className="mr-1" />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Order Details Panel */}
        {selectedOrder && (
          <div className="w-1/2 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Order Details</h2>
                <p className="text-sm font-bold text-gray-400">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shadow-sm border border-gray-100"
              >
                <XOctagon size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">

              {/* Status Actions */}
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Admin Override Status</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')} className="py-2 px-3 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs border border-blue-100 hover:bg-blue-100">Confirm</button>
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')} className="py-2 px-3 rounded-xl bg-purple-50 text-purple-600 font-bold text-xs border border-purple-100 hover:bg-purple-100">Dispatch</button>
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} className="py-2 px-3 rounded-xl bg-green-50 text-green-600 font-bold text-xs border border-green-100 hover:bg-green-100">Force Deliver</button>
                  <button onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')} className="py-2 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-100 hover:bg-red-100">Cancel</button>
                </div>
              </div>

              {/* Users Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center"><User size={14} className="mr-2" /> Customer Info</h3>
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <p className="font-extrabold text-gray-900">{selectedOrder.user?.name || 'Anonymous Customer'}</p>
                    <p className="text-sm text-gray-500 flex items-center mt-1"><Phone size={12} className="mr-2" /> {selectedOrder.user?.phoneNumber || '—'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center"><Bike size={14} className="mr-2" /> Assigned Rider</h3>
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between h-[84px]">
                    {selectedOrder.rider ? (
                      <div>
                        <p className="font-extrabold text-gray-900">{selectedOrder.rider.name}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1"><Phone size={12} className="mr-2" /> {selectedOrder.rider.phoneNumber || '—'}</p>
                      </div>
                    ) : (
                      <p className="font-bold text-gray-400 italic">No rider assigned yet.</p>
                    )}
                  </div>

                  {/* Manual Assignment */}
                  {['pending', 'confirmed'].includes(selectedOrder.status.toLowerCase()) && (
                    <div className="mt-3">
                      <select
                        className="w-full text-xs font-bold border-gray-200 rounded-xl focus:ring-primary focus:border-primary p-2 bg-white shadow-sm"
                        value={selectedOrder.rider?.id || ''}
                        onChange={(e) => handleAssignRider(selectedOrder.id, e.target.value)}
                      >
                        <option value="">Manually Assign Rider...</option>
                        {riders.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.vehicleNumber}) - {r.isOnline ? '🟢 Online' : '🔴 Offline'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center"><MapPin size={14} className="mr-2" /> Delivery Address</h3>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="font-bold text-gray-700">{selectedOrder.address?.streetAddress}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedOrder.address?.city}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center"><ShoppingBag size={14} className="mr-2" /> Order Items ({selectedOrder.items?.length || 0})</h3>
                <ul className="space-y-3">
                  {selectedOrder.items?.map(item => (
                    <li key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : <Package size={20} className="text-gray-300" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{item.product?.name || (item as any).menuItem?.name || 'Item'}</p>
                          <p className="text-xs font-bold text-gray-400">Qty: {item.quantity} × Rs.{Number(item.priceAtTime || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="font-black text-gray-900">Rs. {(item.quantity * Number(item.priceAtTime || 0)).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Batched Sub-Orders */}
              {selectedOrder.subOrders && selectedOrder.subOrders.length > 1 && (
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center"><MapPin size={14} className="mr-2" /> Batched Logistics ({selectedOrder.subOrders.length} Stops)</h3>
                  <div className="space-y-3">
                    {selectedOrder.subOrders.map((sub, idx) => (
                      <div key={sub.id} className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-gray-900">[Stop {idx + 1}] {sub.restaurant?.name || 'Restaurant'}</p>
                          <p className="text-xs text-gray-500 mt-1">{sub.restaurant?.location}</p>
                        </div>
                        {getStatusBadge(sub.status || selectedOrder.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financials */}
              <div className="bg-gray-900 text-white p-6 rounded-3xl mt-8">
                <div className="space-y-2 mb-4 text-sm font-medium text-gray-400">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rs. {Number(selectedOrder.subtotal || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Delivery Fee</span><span>Rs. {Number(selectedOrder.deliveryFee || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <span>Payment Method</span>
                    <span className="px-2 py-1 bg-gray-800 rounded text-xs font-bold uppercase tracking-widest text-primary">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-gray-700">
                  <span className="font-bold">Total Amount</span>
                  <span className="text-3xl font-black text-primary">Rs. {Number(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
