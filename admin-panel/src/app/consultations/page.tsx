'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Search, Eye, Clock, CheckCircle, XCircle, 
  User, Calendar, Video, RefreshCw, X, MessageSquare
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

interface Consultation {
  id: string;
  status: string;
  scheduledAt: string;
  feePaid: number;
  videoRoomId: string;
  visitType: string;
  meetingUrl?: string;
  doctorSummary?: string;
  userNotes?: string;
  user: { id: string; name: string; phoneNumber: string };
  doctor: { id: string; name: string; specialization: string };
  createdAt: string;
}

const API_URL = `${BASE_URL}/pharma/telemedicine/admin/consultations`;

const STATUS_FILTERS = ['ALL', 'scheduled', 'completed', 'cancelled'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
    in_progress: 'badge-purple',
  };
  return <span className={map[status.toLowerCase()] ?? 'badge-gray'}>{status.toUpperCase()}</span>;
}

export default function ConsultationsPage() {
  const [items, setItems] = useState<Consultation[]>([]);
  const { loading, error, setLoading, setError } = useAsyncData();
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Consultation | null>(null);
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
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch consultations'));
      const data = await res.json();
      setItems(data.data || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch consultations'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/consultations/${id}/status`, {
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
    const matchS = i.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   i.doctor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   i.id.includes(searchTerm);
    return matchF && matchS;
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consultation History</h1>
          <p className="page-subtitle">Monitor and manage doctor-patient video bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search by name or ID..."
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

      <div className="flex gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
                  <th>Doctor</th>
                  <th>Scheduled</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10">Loading consultations...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10">No consultations found</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className={`cursor-pointer ${selectedItem?.id === item.id ? 'bg-teal-50' : ''}`}>
                    <td>
                      <p className="font-bold text-slate-800">{item.user?.name}</p>
                      <p className="text-[10px] text-slate-400">#{item.id.slice(0,8)}</p>
                    </td>
                    <td>
                      <p className="font-medium text-slate-700">Dr. {item.doctor?.name}</p>
                      <p className="text-[10px] text-teal-600">{item.doctor?.specialization}</p>
                    </td>
                    <td>
                      <p className="text-sm">{new Date(item.scheduledAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(item.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>
                    <td className="text-center"><StatusBadge status={item.status} /></td>
                    <td className="text-right">
                      <button className="btn-ghost btn-icon text-teal-600"><Eye size={14} /></button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Patient</p>
                  <p className="font-bold text-slate-800">{selectedItem.user?.name}</p>
                  <p className="text-xs text-slate-500">{selectedItem.user?.phoneNumber}</p>
                </div>
                <div className="p-4 bg-teal-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-teal-600 uppercase mb-1">Specialist</p>
                  <p className="font-bold text-slate-800">Dr. {selectedItem.doctor?.name}</p>
                  <p className="text-xs text-teal-600">{selectedItem.doctor?.specialization}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Calendar size={20} /></div>
                  <div>
                    <p className="text-xs text-slate-400">Appointment Time</p>
                    <p className="font-bold text-slate-800">{new Date(selectedItem.scheduledAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    {selectedItem.visitType === 'physical' ? <MessageSquare size={20} /> : <Video size={20} />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Consultation Type</p>
                    <p className="font-bold text-slate-800">{selectedItem.visitType === 'physical' ? 'Physical Visit' : 'Video Call'}</p>
                  </div>
                </div>
              </div>

              {selectedItem.status === 'scheduled' && (
                <div className="space-y-4 p-4 border border-teal-100 bg-teal-50 rounded-2xl">
                  <p className="text-xs font-bold text-teal-700 uppercase">Manage Meeting Link</p>
                  <div className="flex gap-2">
                    <input 
                      className="input flex-1"
                      placeholder="Enter meeting URL (Zoom/Google Meet)..."
                      value={selectedItem.meetingUrl || ''}
                      onChange={e => setSelectedItem({...selectedItem, meetingUrl: e.target.value})}
                    />
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/consultations/${selectedItem.id}/meeting`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ meetingUrl: selectedItem.meetingUrl })
                          });
                          if (res.ok) showToast({ title: 'Meeting link saved', variant: 'success' });
                        } catch {
                          showToast({ title: 'Failed to save link', variant: 'error' });
                        }
                      }}
                      className="btn-primary px-4"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Doctor Summary / Prescription</p>
                <textarea 
                  className="input min-h-[100px] py-3"
                  placeholder="Enter diagnosis summary or meeting notes..."
                  value={selectedItem.doctorSummary || ''}
                  onChange={e => setSelectedItem({...selectedItem, doctorSummary: e.target.value})}
                />
                <button 
                   onClick={async () => {
                    try {
                      const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/consultations/${selectedItem.id}/summary`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ summary: selectedItem.doctorSummary })
                      });
                      if (res.ok) showToast({ title: 'Summary saved', variant: 'success' });
                    } catch {
                      showToast({ title: 'Failed to save summary', variant: 'error' });
                    }
                  }}
                  className="btn-ghost text-teal-600 font-bold text-xs"
                >
                  Update Summary
                </button>
              </div>

              {selectedItem.userNotes && (
                <div className="p-4 border border-slate-100 rounded-2xl bg-white">
                   <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-1"><MessageSquare size={12} /> Patient Notes</p>
                   <p className="text-sm text-slate-700 italic">"{selectedItem.userNotes}"</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Update Booking Status</p>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'completed')} className="btn-success flex-1 py-3">Mark Completed</button>
                  <button onClick={() => handleUpdateStatus(selectedItem.id, 'cancelled')} className="btn-danger flex-1 py-3">Cancel Booking</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
