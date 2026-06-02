'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Play, Pause, X, Eye, Clock, User, Pill, 
  MapPin, CreditCard, Search, Calendar, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface RecurringOrder {
  id: string;
  userId: string;
  user?: { name: string; phoneNumber: string };
  medicineId: string;
  medicine?: { name: string; dosageForm?: string; strength?: string; imageUrl?: string };
  frequency: string;
  quantity: number;
  preferredPharmacyId?: string;
  addressId?: string;
  nextDeliveryDate: string;
  lastDeliveryDate?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  pauseReason?: string;
  prescriptionId?: string;
  totalDeliveries: number;
  missedDeliveries: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = `${BASE_URL}/pharma/recurring`;

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<RecurringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<RecurringOrder | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/admin/all`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load subscriptions'));
      const payload = await res.json();
      setSubscriptions(Array.isArray(payload) ? payload : (payload.data || []));
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load subscriptions'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!selectedSub) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${selectedSub.id}/pause`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: pauseReason }),
      });

      if (res.ok) {
        showToast({ title: 'Subscription paused successfully', variant: 'success' });
        setShowPauseModal(false);
        setPauseReason('');
        setSelectedSub(null);
        fetchSubscriptions();
      } else {
        showToast({ title: await parseApiError(res, 'Failed to pause subscription'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error pausing subscription'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async (sub: RecurringOrder) => {
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${sub.id}/resume`, {
        method: 'PUT',
      });

      if (res.ok) {
        showToast({ title: 'Subscription resumed successfully', variant: 'success' });
        setSelectedSub(null);
        fetchSubscriptions();
      } else {
        showToast({ title: await parseApiError(res, 'Failed to resume subscription'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error resuming subscription'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sub: RecurringOrder) => {
    if (!confirm(`Are you sure you want to cancel the subscription for ${sub.medicine?.name || 'this medicine'}?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${sub.id}/cancel`, {
        method: 'PUT',
      });

      if (res.ok) {
        showToast({ title: 'Subscription cancelled successfully', variant: 'success' });
        setSelectedSub(null);
        fetchSubscriptions();
      } else {
        showToast({ title: await parseApiError(res, 'Failed to cancel subscription'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error cancelling subscription'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics calculation
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const pausedCount = subscriptions.filter(s => s.status === 'paused').length;
  const totalDeliveriesCount = subscriptions.reduce((sum, s) => sum + (s.totalDeliveries || 0), 0);

  // Filter & Search
  const filteredSubs = subscriptions.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesSearch = 
      (sub.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.user?.phoneNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.medicine?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.frequency || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'badge-green';
      case 'paused': return 'badge-yellow';
      case 'cancelled': return 'badge-red';
      case 'completed': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Refill Subscriptions</h1>
          <p className="page-subtitle">Monitor and manage chronic medicine automatic delivery schedules</p>
        </div>
        <button 
          onClick={fetchSubscriptions}
          className="btn-ghost flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="card p-5 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <RefreshCw size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Schedules</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Play size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Refills</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activeCount}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Pause size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Paused Refills</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{pausedCount}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 bg-white border border-slate-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Deliveries</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalDeliveriesCount}</p>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="card p-6 bg-white border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            {['all', 'active', 'paused', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === tab 
                    ? 'bg-white shadow-sm text-primary-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              className="input pl-10 text-sm"
              placeholder="Search by customer, medicine, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table list */}
        {loading ? (
          <div className="py-20 flex justify-center"><Clock className="animate-spin text-slate-300" size={40} /></div>
        ) : filteredSubs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="mx-auto mb-4 opacity-20" size={60} />
            <p className="text-sm font-medium">No subscription schedules found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient / Customer</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Refill Frequency</th>
                  <th className="py-3 px-4">Total Deliveries</th>
                  <th className="py-3 px-4">Next Delivery Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{sub.user?.name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-400">{sub.user?.phoneNumber || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Pill size={14} className="text-slate-400" />
                        {sub.medicine?.name || 'Unknown Medicine'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {sub.medicine?.dosageForm} {sub.medicine?.strength && `(${sub.medicine.strength})`} · Qty: {sub.quantity}
                      </p>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-600">
                      {sub.frequency}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {sub.totalDeliveries}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {sub.nextDeliveryDate ? new Date(sub.nextDeliveryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={getStatusBadge(sub.status)}>{sub.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button 
                        onClick={() => setSelectedSub(sub)} 
                        className="btn-ghost btn-icon p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>

                      {sub.status === 'active' && (
                        <button 
                          disabled={isSubmitting}
                          onClick={() => {
                            setSelectedSub(sub);
                            setShowPauseModal(true);
                          }} 
                          className="btn-ghost btn-icon p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition"
                          title="Pause"
                        >
                          <Pause size={16} />
                        </button>
                      )}

                      {sub.status === 'paused' && (
                        <button 
                          disabled={isSubmitting}
                          onClick={() => handleResume(sub)} 
                          className="btn-ghost btn-icon p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                          title="Resume"
                        >
                          <Play size={16} />
                        </button>
                      )}

                      {sub.status !== 'cancelled' && (
                        <button 
                          disabled={isSubmitting}
                          onClick={() => handleCancel(sub)} 
                          className="btn-ghost btn-icon p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedSub && !showPauseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Subscription Details</h3>
                <p className="text-xs text-slate-400 font-medium">Reference ID: {selectedSub.id}</p>
              </div>
              <button 
                onClick={() => setSelectedSub(null)} 
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Medicine Detail */}
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                  <Pill size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Medicine Information</p>
                  <p className="font-bold text-slate-800 text-base mt-0.5">{selectedSub.medicine?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSub.medicine?.dosageForm} {selectedSub.medicine?.strength && `(${selectedSub.medicine.strength})`} · Qty: {selectedSub.quantity} per refill
                  </p>
                </div>
              </div>

              {/* Patient Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <span>{selectedSub.user?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span>{selectedSub.user?.phoneNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Delivery Schedule details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Schedule</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Frequency</span>
                    <span className="font-semibold text-slate-800 capitalize">{selectedSub.frequency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Payment Method</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <CreditCard size={12} className="text-slate-400" />
                      {selectedSub.paymentMethod?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Start Date</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(selectedSub.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Next Refill Date</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {selectedSub.nextDeliveryDate ? new Date(selectedSub.nextDeliveryDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Last Refill Date</span>
                    <span className="font-semibold text-slate-800">
                      {selectedSub.lastDeliveryDate ? new Date(selectedSub.lastDeliveryDate).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Total Completed Refills</span>
                    <span className="font-semibold text-slate-800">{selectedSub.totalDeliveries}</span>
                  </div>
                </div>
              </div>

              {selectedSub.status === 'paused' && selectedSub.pauseReason && (
                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2 text-xs">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800 block">Pause Reason</span>
                    <span className="text-amber-700">{selectedSub.pauseReason}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
              {selectedSub.status === 'active' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => setShowPauseModal(true)}
                  className="btn-danger bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Pause size={14} />
                  Pause Refills
                </button>
              )}
              {selectedSub.status === 'paused' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => handleResume(selectedSub)}
                  className="btn-success px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Play size={14} />
                  Resume Refills
                </button>
              )}
              {selectedSub.status !== 'cancelled' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => handleCancel(selectedSub)}
                  className="btn-danger px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <X size={14} />
                  Cancel Subscription
                </button>
              )}
              <button 
                onClick={() => setSelectedSub(null)}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs rounded-xl font-semibold text-slate-500 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Reason Dialog Modal */}
      {selectedSub && showPauseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Pause Subscription</h3>
              <button 
                onClick={() => {
                  setShowPauseModal(false);
                  setPauseReason('');
                }} 
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Please enter a reason for pausing the subscription. This reason will be visible to the customer.
              </p>
              <div>
                <label className="input-label text-xs">Reason</label>
                <textarea 
                  className="input min-h-[90px] text-xs py-2" 
                  placeholder="e.g. Temporary stock issue / Customer request"
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end text-xs">
              <button 
                onClick={() => {
                  setShowPauseModal(false);
                  setPauseReason('');
                }}
                className="border border-slate-200 hover:bg-slate-50 px-3.5 py-1.5 rounded-lg font-semibold text-slate-500 transition"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting}
                onClick={handlePause}
                className="btn-danger bg-amber-500 hover:bg-amber-600 px-4 py-1.5 rounded-lg flex items-center gap-1"
              >
                Pause Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
