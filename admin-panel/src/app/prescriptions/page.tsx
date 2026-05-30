'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, X, Eye, Clock, User, FileText, AlertCircle, 
  ExternalLink, Calendar, Search, Filter
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface Prescription {
  id: string;
  userId: string;
  user?: { name: string; phoneNumber: string };
  imageUrl: string;
  additionalImageUrls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  doctorName?: string;
  patientName?: string;
  doctorNotes?: string;
  reviewerNotes?: string;
  createdAt: string;
  validUntil?: string;
}

const API_URL = `${BASE_URL}/pharma/prescriptions`;

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  useEffect(() => {
    if (selectedRx) {
      setReviewNotes(selectedRx.reviewerNotes || '');
      setValidUntil(selectedRx.validUntil ? new Date(selectedRx.validUntil).toISOString().split('T')[0] : '');
      setActiveImageIndex(0);
    } else {
      setReviewNotes('');
      setValidUntil('');
      setActiveImageIndex(0);
    }
  }, [selectedRx]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending' ? `${API_URL}/admin/queue` : API_URL;
      const res = await fetchWithAuth(endpoint);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load prescriptions'));
      const payload = await res.json();
      setPrescriptions(Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []));
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load queue'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRx) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${selectedRx.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes: reviewNotes,
          validUntil: validUntil || undefined 
        }),
      });

      if (res.ok) {
        showToast({ title: 'Prescription approved', variant: 'success' });
        setSelectedRx(null);
        fetchQueue();
      } else {
        showToast({ title: await parseApiError(res, 'Approval failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error approving Rx'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRx || !reviewNotes) {
      showToast({ title: 'Please provide a reason for rejection in notes', variant: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${selectedRx.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reviewNotes }),
      });

      if (res.ok) {
        showToast({ title: 'Prescription rejected', variant: 'success' });
        setSelectedRx(null);
        fetchQueue();
      } else {
        showToast({ title: await parseApiError(res, 'Rejection failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error rejecting Rx'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-yellow';
      case 'consultation_requested': return 'badge-purple';
      case 'approved': return 'badge-green';
      case 'rejected': return 'badge-red';
      case 'in_review': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prescription Review Queue</h1>
          <p className="page-subtitle">Pharmacist verification dashboard · {prescriptions.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === 'pending' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pending
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === 'all' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List View */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="card p-20 flex justify-center"><Clock className="animate-spin text-slate-300" size={40} /></div>
          ) : prescriptions.length === 0 ? (
            <div className="card p-20 text-center text-slate-400">
              <FileText className="mx-auto mb-4 opacity-20" size={60} />
              <p>Queue is empty. No prescriptions awaiting review.</p>
            </div>
          ) : (
            prescriptions.map(rx => (
              <div 
                key={rx.id} 
                onClick={() => setSelectedRx(rx)}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md border-2 ${selectedRx?.id === rx.id ? 'border-primary-500' : 'border-transparent'}`}
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                    <img src={normalizeUrl(rx.imageUrl)} className="w-full h-full object-cover" alt="Rx" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{rx.patientName || 'Anonymous Patient'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <User size={12} /> {rx.user?.name || 'User ID: ' + rx.userId.slice(0,8)}
                        </p>
                      </div>
                      <span className={getStatusBadge(rx.status)}>{rx.status}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={12} /> {new Date(rx.createdAt).toLocaleString()}
                      </div>
                      {rx.doctorName && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <User size={12} /> Dr. {rx.doctorName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-1">
          {selectedRx ? (
            <div className="card p-6 sticky top-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">Review Details</h2>
                <button onClick={() => setSelectedRx(null)} className="btn-ghost btn-icon p-1"><X size={18} /></button>
              </div>

               <div className="space-y-4">
                 {(() => {
                   const images = [selectedRx.imageUrl, ...(selectedRx.additionalImageUrls || [])].filter(Boolean);
                   const activeImg = images[activeImageIndex] || selectedRx.imageUrl;
                   return (
                     <>
                       <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
                         <img src={normalizeUrl(activeImg)} className="w-full h-full object-contain" alt="Rx View" />
                         <a 
                           href={normalizeUrl(activeImg)} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <ExternalLink size={18} className="text-slate-700" />
                         </a>
                       </div>
                       
                       {images.length > 1 && (
                         <div className="flex gap-2 overflow-x-auto py-1">
                           {images.map((img, idx) => (
                             <button
                               key={idx}
                               type="button"
                               onClick={() => setActiveImageIndex(idx)}
                               className={`w-12 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                                 activeImageIndex === idx ? 'border-primary-500 scale-105' : 'border-slate-200 opacity-60'
                               }`}
                             >
                               <img src={normalizeUrl(img)} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                             </button>
                           ))}
                         </div>
                       )}
                     </>
                   );
                 })()}

                <div className="space-y-3">
                  <div>
                    <label className="input-label">Pharmacist Notes</label>
                    <textarea 
                      className="input min-h-[100px] py-3" 
                      placeholder="Verified Panadol 500mg, 2 packs..."
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Validity (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date" 
                        className="input pl-10"
                        value={validUntil}
                        onChange={e => setValidUntil(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    disabled={isSubmitting}
                    onClick={handleReject}
                    className="flex-1 btn-danger py-3"
                  >
                    Reject
                  </button>
                  <button 
                    disabled={isSubmitting}
                    onClick={handleApprove}
                    className="flex-[2] btn-success py-3"
                  >
                    Approve Rx
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center space-y-3 border-dashed bg-slate-50/50">
              <Eye className="mx-auto text-slate-300" size={32} />
              <p className="text-sm text-slate-500 font-medium">Select a prescription from the queue to start reviewing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
