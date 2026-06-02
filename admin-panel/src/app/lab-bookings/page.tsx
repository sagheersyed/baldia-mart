'use client';

import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Search, Eye, Clock, CheckCircle, XCircle, 
  User, Calendar, MapPin, RefreshCw, X, ClipboardList, FileText
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

interface LabBooking {
  id: string;
  status: string;
  scheduledDate: string;
  timeSlot: string;
  totalAmount: number;
  patientName: string;
  patientPhone: string;
  reportUrl?: string;
  labTests: { id: string; name: string; price: number }[];
  address: { streetAddress: string; city: string };
  createdAt: string;
}

const API_URL = `${BASE_URL}/pharma/lab/admin/bookings`;

const STATUS_FILTERS = ['ALL', 'pending', 'collector_assigned', 'sample_collected', 'in_lab', 'results_ready', 'cancelled'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow',
    collector_assigned: 'badge-blue',
    sample_collected: 'badge-purple',
    in_lab: 'badge-orange',
    results_ready: 'badge-green',
    cancelled: 'badge-red',
  };
  return <span className={map[status.toLowerCase()] ?? 'badge-gray'}>{status.replace(/_/g, ' ').toUpperCase()}</span>;
}

export default function LabBookingsPage() {
  const [items, setItems] = useState<LabBooking[]>([]);
  const { loading, error, setLoading, setError } = useAsyncData();
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<LabBooking | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchItems(page);
  }, [page]);

  const fetchItems = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      const res = await fetchWithAuth(`${API_URL}?${params}`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch lab bookings'));
      const data = await res.json();
      setItems(data.data || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch lab bookings'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/lab/admin/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setItems(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x));
        if (selectedItem?.id === id) setSelectedItem(s => s ? { ...s, status: newStatus } : s);
        showToast({ title: 'Status updated', variant: 'success' });
      }
    } catch (err) {
      showToast({ title: 'Update failed', variant: 'error' });
    }
  };

  const filteredItems = items.filter(i => {
    const matchF = filter === 'ALL' || i.status === filter;
    const name = i.patientName || '';
    const id = i.id || '';
    const matchS = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   id.includes(searchTerm);
    return matchF && matchS;
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lab Booking History</h1>
          <p className="page-subtitle">Track and manage laboratory test appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search by patient or ID..."
              className="input pl-10 w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => fetchItems(page)} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className={`card overflow-hidden transition-all duration-300 ${selectedItem ? 'w-1/2' : 'w-full'}`}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Tests</th>
                  <th>Appointment</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10">Loading bookings...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10">No bookings found</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className={`cursor-pointer ${selectedItem?.id === item.id ? 'bg-indigo-50' : ''}`}>
                    <td>
                      <p className="font-bold text-slate-800">{item.patientName}</p>
                      <p className="text-[10px] text-slate-400">#{item.id.slice(0,8)}</p>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-slate-600">{item.labTests?.length} Tests</p>
                      <p className="text-[10px] text-indigo-600">Rs. {item.totalAmount}</p>
                    </td>
                    <td>
                      <p className="text-xs font-bold">{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{item.timeSlot || 'Anytime'}</p>
                    </td>
                    <td className="text-center"><StatusBadge status={item.status} /></td>
                    <td className="text-right">
                      <button className="btn-ghost btn-icon text-indigo-600"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100">
             <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        {selectedItem && (
          <div className="w-1/2 card animate-slide-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Booking Details</h2>
              <button onClick={() => setSelectedItem(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Patient Info</p>
                    <p className="font-bold text-slate-800 text-lg">{selectedItem.patientName}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Clock size={12} /> {selectedItem.patientPhone}</p>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Appointment</p>
                    <p className="text-sm font-bold flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {selectedItem.scheduledDate ? new Date(selectedItem.scheduledDate).toLocaleDateString() : 'N/A'}</p>
                    <p className="text-xs text-slate-500 ml-5">{selectedItem.timeSlot || 'Anytime'}</p>
                 </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Collection Point</p>
                   <p className="text-sm font-bold flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {selectedItem.address?.city}</p>
                   <p className="text-xs text-slate-500 ml-5 truncate" title={selectedItem.address?.streetAddress}>{selectedItem.address?.streetAddress}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5"><ClipboardList size={14} /> Tests Requested</p>
                <div className="space-y-2">
                  {selectedItem.labTests?.map(test => (
                    <div key={test.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl">
                      <p className="text-sm font-medium">{test.name}</p>
                      <p className="text-sm font-black text-indigo-600">Rs. {test.price}</p>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 bg-slate-900 text-white rounded-xl">
                    <p className="text-sm font-bold">Total Paid</p>
                    <p className="text-sm font-black text-indigo-400">Rs. {selectedItem.totalAmount}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase">Fulfillment Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'collector_assigned')} className="btn-ghost border-indigo-200 text-indigo-700 py-2 text-xs">Assign Collector</button>
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'sample_collected')} className="btn-ghost border-purple-200 text-purple-700 py-2 text-xs">Sample Collected</button>
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'in_lab')} className="btn-ghost border-orange-200 text-orange-700 py-2 text-xs">Processing in Lab</button>
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'results_ready')} className="btn-success py-2 text-xs">Upload & Ready</button>
                </div>
              </div>

              {selectedItem.status === 'results_ready' && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><FileText size={20} /></div>
                    <p className="text-sm font-bold text-green-800">Report Available</p>
                  </div>
                  <button className="text-xs font-black text-green-700 underline">View Report</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
