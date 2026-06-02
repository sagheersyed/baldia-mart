'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, X, Eye, Clock, User, FileText, AlertCircle, 
  ExternalLink, Calendar, Search, Filter, ZoomIn, ZoomOut, 
  RotateCcw, ShieldAlert, Plus, Trash2, CheckCircle2, DollarSign
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface UserInfo {
  name: string;
  phoneNumber: string;
  email?: string;
}

interface Prescription {
  id: string;
  userId: string;
  user?: UserInfo;
  imageUrl: string;
  additionalImageUrls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  doctorName?: string;
  doctorPmdcReg?: string;
  patientName?: string;
  doctorNotes?: string;
  reviewerNotes?: string;
  createdAt: string;
  validUntil?: string;
  isFlagged?: boolean;
  flagReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface Medicine {
  id: string;
  name: string;
  dosageForm: string;
  strength: string;
  mrp: number;
  brand?: { name: string };
}

const API_URL = `${BASE_URL}/pharma/prescriptions`;

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  
  // Review inputs
  const [reviewNotes, setReviewNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPmdcReg, setDoctorPmdcReg] = useState('');
  const [maxRefills, setMaxRefills] = useState(1);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('INVALID_IMAGE');
  
  // Medicine selection
  const [medQuery, setMedQuery] = useState('');
  const [medResults, setMedResults] = useState<Medicine[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<{ id: string; name: string; quantity: number; isSubstituted?: boolean; originalMedicineId?: string; isManual?: boolean; mrp?: number }[]>([]);
  const [searchingMeds, setSearchingMeds] = useState(false);

  // Quote Engine state
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(49);
  
  // UX controls
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [splitScreen, setSplitScreen] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  useEffect(() => {
    if (selectedRx) {
      setReviewNotes(selectedRx.reviewerNotes || '');
      setValidUntil(selectedRx.validUntil ? new Date(selectedRx.validUntil).toISOString().split('T')[0] : '');
      setDoctorName(selectedRx.doctorName || '');
      setDoctorPmdcReg(selectedRx.doctorPmdcReg || '');
      setMaxRefills(1);
      setIsFlagged(selectedRx.isFlagged || false);
      setFlagReason(selectedRx.flagReason || '');
      setActiveImageIndex(0);
      setZoomScale(1);
      setSelectedMeds([]);
      setShowQuoteBuilder(false);
    } else {
      setReviewNotes('');
      setValidUntil('');
      setDoctorName('');
      setDoctorPmdcReg('');
      setMaxRefills(1);
      setIsFlagged(false);
      setFlagReason('');
      setActiveImageIndex(0);
      setZoomScale(1);
      setSelectedMeds([]);
      setShowQuoteBuilder(false);
    }
  }, [selectedRx]);

  // Autocomplete medicine search
  useEffect(() => {
    if (!medQuery.trim()) {
      setMedResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingMeds(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/pharma/medicines/search?query=${encodeURIComponent(medQuery)}&limit=10`);
        if (res.ok) {
          const payload = await res.json();
          setMedResults(Array.isArray(payload) ? payload : (payload.data || []));
        }
      } catch (err) {
        console.error('Error searching medicines', err);
      } finally {
        setSearchingMeds(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [medQuery]);

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
          validUntil: validUntil || undefined,
          medicineIds: selectedMeds.map(m => m.id),
          doctorName,
          doctorPmdcReg,
          maxRefills,
          isFlagged,
          flagReason: isFlagged ? flagReason : undefined,
        }),
      });

      if (res.ok) {
        showToast({ title: 'Prescription approved successfully!', variant: 'success' });
        
        if (selectedMeds.length > 0) {
          // Open the quote builder dialog immediately
          setShowQuoteBuilder(true);
        } else {
          setSelectedRx(null);
          fetchQueue();
        }
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
    if (!selectedRx) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${selectedRx.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: `${rejectionReason}: ${reviewNotes}` 
        }),
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

  // Submit Quotation
  const handleGenerateQuotation = async () => {
    if (!selectedRx) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId: selectedRx.id,
          items: selectedMeds,
          deliveryCharges: deliveryFee,
        }),
      });

      if (res.ok) {
        showToast({ title: 'Prescription quotation generated & sent to customer!', variant: 'success' });
        setSelectedRx(null);
        setShowQuoteBuilder(false);
        fetchQueue();
      } else {
        showToast({ title: await parseApiError(res, 'Quotation generation failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Error generating quotation'), variant: 'error' });
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
          <button 
            onClick={() => setSplitScreen(!splitScreen)} 
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${splitScreen ? 'bg-primary-50 border-primary-500 text-primary-600' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            Split Screen View
          </button>
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
        <div className={`${splitScreen ? 'hidden lg:block lg:col-span-1 space-y-4' : 'lg:col-span-2 space-y-4'}`}>
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
                          <User size={12} /> {rx.user?.name || 'User ID: ' + rx.userId.slice(0,8)} ({rx.user?.phoneNumber || 'No phone'})
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
        <div className={`${splitScreen ? 'lg:col-span-2' : 'lg:col-span-1'} grid grid-cols-1 ${splitScreen ? 'md:grid-cols-2' : ''} gap-6`}>
          {selectedRx ? (
            <>
              {/* Left Panel: Images & Zoom controls */}
              <div className="card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">Prescription Image</h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoomScale(Math.min(zoomScale + 0.2, 3))} className="btn-ghost p-1.5 rounded-lg" title="Zoom In"><ZoomIn size={16} /></button>
                    <button onClick={() => setZoomScale(Math.max(zoomScale - 0.2, 0.6))} className="btn-ghost p-1.5 rounded-lg" title="Zoom Out"><ZoomOut size={16} /></button>
                    <button onClick={() => setZoomScale(1)} className="btn-ghost p-1.5 rounded-lg" title="Reset Zoom"><RotateCcw size={16} /></button>
                  </div>
                </div>

                {(() => {
                  const images = [selectedRx.imageUrl, ...(selectedRx.additionalImageUrls || [])].filter(Boolean);
                  const activeImg = images[activeImageIndex] || selectedRx.imageUrl;
                  return (
                    <>
                      <div className="aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 relative group flex items-center justify-center">
                        <img 
                          src={normalizeUrl(activeImg)} 
                          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.1s ease-out' }}
                          className="w-full h-full object-contain" 
                          alt="Rx View" 
                        />
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

                {/* Patient Information Box */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Patient Information</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-slate-700">Patient: {selectedRx.patientName || 'Anonymous'}</p>
                    <p className="text-slate-500">Contact: {selectedRx.user?.phoneNumber || 'No phone'}</p>
                    <p className="text-slate-500">Submitted: {new Date(selectedRx.createdAt).toLocaleString()}</p>
                    {selectedRx.doctorNotes && (
                      <p className="text-slate-600 bg-white p-2 rounded border text-xs mt-2 italic">
                        " {selectedRx.doctorNotes} "
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Compliance details, medicine selection, & actions */}
              <div className="card p-6 space-y-6">
                {!showQuoteBuilder ? (
                  <>
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <h2 className="font-bold text-lg">Verification & Audit</h2>
                        <p className="text-xs text-slate-400">Match PMDC reg and select medicines</p>
                      </div>
                      {splitScreen && (
                        <button onClick={() => setSelectedRx(null)} className="btn-ghost p-1"><X size={18} /></button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Doctor Metadata */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="input-label">Physician Name</label>
                          <input 
                            type="text" 
                            className="input" 
                            placeholder="Dr. Ayesha" 
                            value={doctorName}
                            onChange={e => setDoctorName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="input-label">PMDC Reg Number</label>
                          <input 
                            type="text" 
                            className="input" 
                            placeholder="12345-P" 
                            value={doctorPmdcReg}
                            onChange={e => setDoctorPmdcReg(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Medicine Search & Selection */}
                      <div className="space-y-2">
                        <label className="input-label text-primary-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Prescribed Medicines (Linked to Rx)
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            className="input pl-10" 
                            placeholder="Search & add medicines..."
                            value={medQuery}
                            onChange={e => setMedQuery(e.target.value)}
                          />
                        </div>

                        {medQuery.trim().length > 0 && (
                          <div className="flex justify-between items-center px-1">
                            <button
                              type="button"
                              onClick={() => {
                                const name = medQuery.trim();
                                const id = `manual-${Date.now()}`;
                                setSelectedMeds([...selectedMeds, { id, name, quantity: 1, isManual: true, mrp: 0 }]);
                                setMedQuery('');
                                setMedResults([]);
                              }}
                              className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-semibold py-1.5 transition-colors"
                            >
                              <Plus size={14} /> Add &ldquo;{medQuery.trim()}&rdquo; as manual/custom medicine
                            </button>
                          </div>
                        )}

                        {searchingMeds && <p className="text-xs text-slate-400 italic">Searching database...</p>}

                        {medResults.length > 0 && (
                          <div className="bg-white border rounded-xl max-h-40 overflow-y-auto divide-y shadow-lg">
                            {medResults.map(med => (
                              <div 
                                key={med.id}
                                onClick={() => {
                                  if (!selectedMeds.some(m => m.id === med.id)) {
                                    setSelectedMeds([...selectedMeds, { id: med.id, name: med.name, quantity: 1 }]);
                                  }
                                  setMedQuery('');
                                  setMedResults([]);
                                }}
                                className="p-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">{med.name}</span>
                                  <span className="text-xs text-slate-400 ml-2">({med.strength} - {med.dosageForm})</span>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">Rs. {med.mrp}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedMeds.length > 0 ? (
                          <div className="border border-slate-100 rounded-xl divide-y bg-slate-50/50 p-2.5 space-y-2">
                            {selectedMeds.map((med, index) => (
                              <div key={med.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1 text-sm">
                                <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-700">{med.name}</span>
                                  {med.isManual && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                  {med.isManual && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-400 font-medium">Price:</span>
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="Rs"
                                        className="input w-20 text-center py-1 px-1 h-8 text-xs font-semibold"
                                        value={med.mrp || ''}
                                        onChange={e => {
                                          const updated = [...selectedMeds];
                                          updated[index].mrp = parseFloat(e.target.value) || 0;
                                          setSelectedMeds(updated);
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-400 font-medium">Qty:</span>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      className="input w-12 text-center py-1 px-1 h-8 text-xs" 
                                      value={med.quantity}
                                      onChange={e => {
                                        const updated = [...selectedMeds];
                                        updated[index].quantity = parseInt(e.target.value, 10) || 1;
                                        setSelectedMeds(updated);
                                      }}
                                    />
                                  </div>
                                  <button 
                                    onClick={() => setSelectedMeds(selectedMeds.filter(m => m.id !== med.id))}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    type="button"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No medicines linked yet. Use search box above to prescribe.</p>
                        )}
                      </div>

                      {/* Expiry, Refills & Compliance */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="input-label">Max Refills Allowed</label>
                          <input 
                            type="number" 
                            min="1" 
                            className="input" 
                            value={maxRefills}
                            onChange={e => setMaxRefills(parseInt(e.target.value, 10) || 1)}
                          />
                        </div>
                        <div>
                          <label className="input-label">Validity Expiration</label>
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

                      {/* Suspicious Drug Flagging */}
                      <div className="border border-red-100 rounded-xl p-3 bg-red-50/20 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-red-700">
                          <input 
                            type="checkbox" 
                            checked={isFlagged}
                            onChange={e => setIsFlagged(e.target.checked)}
                            className="rounded border-red-300 text-red-600 focus:ring-red-500"
                          />
                          <ShieldAlert size={14} /> Flag as Suspicious / Narcotic Audit
                        </label>
                        {isFlagged && (
                          <input 
                            type="text" 
                            className="input text-xs" 
                            placeholder="Reason for flagging (e.g. Altered date/dosage)..." 
                            value={flagReason}
                            onChange={e => setFlagReason(e.target.value)}
                          />
                        )}
                      </div>

                      {/* Pharmacist Review Comments */}
                      <div>
                        <label className="input-label">Pharmacist Notes</label>
                        <textarea 
                          className="input min-h-[80px] py-2" 
                          placeholder="Audit verification details..." 
                          value={reviewNotes}
                          onChange={e => setReviewNotes(e.target.value)}
                        />
                      </div>

                      {/* Rejection Code Select (only visible/used if Reject clicked) */}
                      <div className="flex items-center gap-2 border-t pt-3">
                        <label className="input-label shrink-0 mb-0">Rejection Code:</label>
                        <select 
                          className="input py-1 text-xs"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                        >
                          <option value="INVALID_IMAGE">Invalid/Unclear Image</option>
                          <option value="EXPIRED_PRESCRIPTION">Expired Prescription Date</option>
                          <option value="DRUG_OVERDOSE">Drug Overdose Warning</option>
                          <option value="SUSPICIOUS_FRAUD">Suspicious/Fraudulent Rx</option>
                          <option value="OTHER">Other Rejection Reason</option>
                        </select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t pt-4 space-y-4">
                      {selectedRx.status === 'approved' ? (
                        <div className="space-y-3">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-sm flex flex-col gap-1.5 shadow-sm">
                            <span className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 size={16} className="text-emerald-600" /> Approved Prescription
                            </span>
                            <span className="text-xs text-emerald-600">
                              Reviewed by {selectedRx.reviewedBy || 'Pharmacist'} on {selectedRx.reviewedAt ? new Date(selectedRx.reviewedAt).toLocaleString() : new Date().toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowQuoteBuilder(true)}
                            className="w-full btn-primary py-2.5 font-bold flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <DollarSign size={18} /> Generate / Resend Quotation
                          </button>
                        </div>
                      ) : selectedRx.status === 'rejected' ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-800 text-sm flex flex-col gap-1.5 shadow-sm">
                          <span className="font-bold flex items-center gap-1.5">
                            <ShieldAlert size={16} className="text-rose-600" /> Rejected Prescription
                          </span>
                          <span className="text-xs text-rose-600">
                            Reason: {selectedRx.rejectionReason || 'No reason provided'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button 
                            disabled={isSubmitting}
                            onClick={handleReject}
                            className="flex-1 btn-danger py-2.5"
                          >
                            Reject Rx
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={handleApprove}
                            className="flex-[2] btn-success py-2.5 font-bold flex items-center justify-center gap-1"
                          >
                            <Check size={18} /> Approve Rx
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  // Step 2: Auto Quotation Builder
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <h2 className="font-bold text-lg text-primary-700 flex items-center gap-1">
                          <DollarSign size={20} /> Generate Quotation
                        </h2>
                        <p className="text-xs text-slate-400">Configure pricing and delivery charges</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl space-y-2 border">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quotation Summary</p>
                        <div className="text-sm divide-y">
                          {selectedMeds.map(m => (
                            <div key={m.id} className="py-2 flex justify-between">
                              <span className="text-slate-700 font-medium">{m.name} x {m.quantity}</span>
                              <span className="text-slate-500 text-xs italic">
                                {m.isManual ? `Rs. ${(m.mrp || 0) * m.quantity}` : 'Pricing computed dynamically'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="input-label">Delivery Charges (PKR)</label>
                        <input 
                          type="number" 
                          className="input" 
                          value={deliveryFee}
                          onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 border-t pt-4">
                      <button 
                        onClick={() => {
                          setShowQuoteBuilder(false);
                          setSelectedRx(null);
                          fetchQueue();
                        }}
                        className="flex-1 btn-ghost py-2.5"
                      >
                        Skip Quotation
                      </button>
                      <button 
                        disabled={isSubmitting}
                        onClick={handleGenerateQuotation}
                        className="flex-[2] btn-primary py-2.5 font-bold flex items-center justify-center gap-1"
                      >
                        <Check size={18} /> Send Quotation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-10 text-center space-y-3 border-dashed bg-slate-50/50 flex flex-col items-center justify-center min-h-[300px]">
              <Eye className="mx-auto text-slate-300" size={32} />
              <p className="text-sm text-slate-500 font-medium">Select a prescription from the queue to start reviewing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
