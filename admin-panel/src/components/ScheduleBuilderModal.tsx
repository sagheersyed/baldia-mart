'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Calendar, Clock, RefreshCw, 
  Building2, DollarSign, Activity, Check, CalendarDays,
  ArrowRight, Info, AlertCircle
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';
import Link from 'next/link';

interface ScheduleBuilderModalProps {
  doctorId: string;
  doctorName: string;
  onClose: () => void;
}

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
];

export default function ScheduleBuilderModal({ doctorId, doctorName, onClose }: ScheduleBuilderModalProps) {
  const [clinics, setClinics] = useState<any[]>([]);
  const [assignedClinics, setAssignedClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Step 1: Assign to Clinic
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({
    clinicId: '',
    fee: '1500',
    type: 'physical' // physical or video
  });

  // Step 2: Templates
  const [activeLink, setActiveLink] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 15
  });

  useEffect(() => {
    fetchData();
  }, [doctorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/pharma/telemedicine/clinics`),
        fetchWithAuth(`${BASE_URL}/pharma/telemedicine/doctors/${doctorId}/clinics`)
      ]);
      
      const cData = await cRes.json();
      const aData = await aRes.json();
      
      setClinics(cData || []);
      setAssignedClinics(aData || []);
      
      // Auto-select first clinic if available
      if (aData && aData.length > 0) {
        setActiveLink(aData[0]);
        fetchTemplates(aData[0].id);
      }
    } catch (e) {
      showToast({ title: 'Failed to load data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClinic = async () => {
    if (!assignForm.clinicId) {
       showToast({ title: 'Please select a clinic', variant: 'warning' });
       return;
    }
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/admin/doctors/${doctorId}/assign-clinic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: assignForm.clinicId,
          fee: parseFloat(assignForm.fee),
          type: assignForm.type
        })
      });
      if (res.ok) {
        showToast({ title: 'Clinic linked successfully', variant: 'success' });
        setShowAssign(false);
        fetchData();
      }
    } catch (e) {
      showToast({ title: 'Failed to assign clinic', variant: 'error' });
    }
  };

  const fetchTemplates = async (linkId: string) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/doctor-clinics/${linkId}/template`);
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      showToast({ title: 'Failed to load templates', variant: 'error' });
    }
  };

  const handleSetTemplate = async () => {
    if (!activeLink) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/admin/doctor-clinics/${activeLink.id}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: [...templates, newTemplate] })
      });
      if (res.ok) {
        showToast({ title: 'Schedule updated', variant: 'success' });
        fetchTemplates(activeLink.id);
      }
    } catch (e) {
      showToast({ title: 'Failed to update schedule', variant: 'error' });
    }
  };

  const removeTemplate = async (templateId: string) => {
     const updated = templates.filter(t => t.id !== templateId);
     try {
      await fetchWithAuth(`${BASE_URL}/pharma/telemedicine/admin/doctor-clinics/${activeLink.id}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: updated })
      });
      setTemplates(updated);
      showToast({ title: 'Slot removed', variant: 'success' });
    } catch (e) {
      showToast({ title: 'Failed to remove', variant: 'error' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-5xl min-h-[650px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="modal-header border-b border-indigo-50 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
               <CalendarDays size={24} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-xl tracking-tight">Weekly Schedule Builder</h2>
              <p className="text-xs text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={12} /> Dr. {doctorName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Clinics */}
          <div className="w-80 border-r border-slate-100 bg-slate-50/50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practice Locations</h3>
              <button 
                onClick={() => setShowAssign(!showAssign)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all shadow-sm ${showAssign ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {showAssign ? 'Cancel' : <><Plus size={14} /> Link Clinic</>}
              </button>
            </div>

            {showAssign && (
              <div className="mb-6 p-4 bg-white border border-indigo-100 rounded-2xl shadow-xl shadow-indigo-50/50 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase">Select Clinic</label>
                  {clinics.length > 0 ? (
                    <select 
                      className="input text-xs py-2 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      value={assignForm.clinicId}
                      onChange={e => setAssignForm({...assignForm, clinicId: e.target.value})}
                    >
                      <option value="">Choose Clinic...</option>
                      {clinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                       <p className="text-[10px] text-amber-700 font-bold leading-relaxed">No clinics available in the system.</p>
                       <Link href="/clinics" className="text-[10px] text-indigo-600 font-black underline mt-1 block">Create Clinics Now →</Link>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase">Visit Type</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAssignForm({...assignForm, type: 'physical'})}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${assignForm.type === 'physical' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-100 text-slate-400'}`}
                      >
                        Physical
                      </button>
                      <button 
                        onClick={() => setAssignForm({...assignForm, type: 'video'})}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${assignForm.type === 'video' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}
                      >
                        Video
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase">Consultation Fee (Rs.)</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        className="input text-xs py-2 pl-9 bg-slate-50 border-slate-200" 
                        type="number" 
                        value={assignForm.fee}
                        onChange={e => setAssignForm({...assignForm, fee: e.target.value})}
                        placeholder="1500"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAssignClinic}
                  disabled={!assignForm.clinicId}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  Confirm Link
                </button>
              </div>
            )}

            <div className="space-y-3">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw size={24} className="mx-auto text-indigo-400 animate-spin" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                </div>
              ) : assignedClinics.length === 0 ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Building2 size={24} className="text-slate-400" />
                   </div>
                   <p className="text-xs font-bold text-slate-500 mb-1">No Clinics Linked</p>
                   <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Link this doctor to a practice location to manage their schedule.</p>
                   {!showAssign && (
                     <button 
                       onClick={() => setShowAssign(true)}
                       className="text-[10px] font-black text-indigo-600 uppercase underline"
                     >
                       Get Started Now
                     </button>
                   )}
                </div>
              ) : assignedClinics.map(link => (
                <button 
                  key={link.id}
                  onClick={() => { setActiveLink(link); fetchTemplates(link.id); }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative group ${activeLink?.id === link.id ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-50' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${activeLink?.id === link.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-black text-slate-800 truncate block">{link.clinic?.name}</span>
                      <span className="text-[10px] text-slate-400 truncate block font-medium">{link.clinic?.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${link.consultationType === 'video' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                        {link.consultationType}
                      </span>
                      <span className="text-slate-400 font-bold text-[10px]">Rs. {link.consultationFee}</span>
                    </div>
                    {activeLink?.id === link.id && (
                      <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Weekly Template */}
          <div className="flex-1 bg-white p-8 overflow-y-auto">
            {activeLink ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <Building2 size={18} className="text-indigo-600" />
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{activeLink.clinic?.name}</h3>
                     </div>
                     <p className="text-sm text-slate-500 font-medium">{activeLink.clinic?.address}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1.5">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">Weekly Template</span>
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Activity size={14} className="text-teal-500" /> ACTIVE
                     </div>
                   </div>
                </div>

                {/* Add Template Form */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Create New Slot</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-6 bg-white border-2 border-slate-50 rounded-3xl shadow-sm items-end">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Day of Week</label>
                      <select 
                        className="input text-xs py-2 bg-slate-50 border-slate-100"
                        value={newTemplate.dayOfWeek}
                        onChange={e => setNewTemplate({...newTemplate, dayOfWeek: parseInt(e.target.value)})}
                      >
                        {DAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Start Time</label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          className="input text-xs py-2 pl-9 bg-slate-50 border-slate-100" 
                          value={newTemplate.startTime}
                          onChange={e => setNewTemplate({...newTemplate, startTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">End Time</label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          className="input text-xs py-2 pl-9 bg-slate-50 border-slate-100" 
                          value={newTemplate.endTime}
                          onChange={e => setNewTemplate({...newTemplate, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleSetTemplate}
                      className="bg-indigo-600 text-white h-10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                    >
                      <Plus size={16} /> Add To Schedule
                    </button>
                  </div>
                </div>

                {/* Templates List Grouped by Day */}
                <div className="space-y-6">
                   <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Weekly Overview</h4>
                  </div>
                  
                  {DAYS.map(day => {
                    const dayTemplates = templates.filter(t => t.dayOfWeek === day.id);
                    if (dayTemplates.length === 0) return null;
                    return (
                      <div key={day.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                              <Calendar size={14} />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{day.name}</h4>
                          </div>
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{dayTemplates.length} SLOTS</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {dayTemplates.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl bg-slate-50/30 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                  <Clock size={12} className="text-indigo-400" />
                                </div>
                                <span className="text-xs font-black text-slate-700">{t.startTime} - {t.endTime}</span>
                              </div>
                              <button 
                                onClick={() => removeTemplate(t.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {templates.length === 0 && (
                    <div className="text-center py-24 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px] px-10">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-50">
                        <Calendar size={40} className="text-slate-200" />
                      </div>
                      <h5 className="text-sm font-black text-slate-800 mb-2">Build Your Schedule</h5>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mb-8 font-medium">Define recurring weekly slots for this clinic by selecting a day and time range above.</p>
                      <div className="flex items-center justify-center gap-2 text-[10px] font-black text-indigo-400 bg-white py-2 px-4 rounded-full inline-flex border border-slate-100">
                         <Info size={12} /> TIP: Slots will be auto-generated based on these rules.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-32 h-32 bg-indigo-50/50 rounded-[40px] flex items-center justify-center mb-8 relative">
                   <div className="absolute inset-0 bg-indigo-600/5 rounded-[40px] animate-pulse" />
                   <Building2 size={64} className="text-indigo-200 relative z-10" />
                   <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                      <Plus size={24} className="text-indigo-600" />
                   </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Configure Availability</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-10 leading-relaxed font-medium">
                  {assignedClinics.length > 0 
                    ? "Choose one of the linked practice locations on the left to start defining weekly availability templates."
                    : "To manage this doctor's schedule, you first need to link them to a practice location (Hospital, Clinic, or Video Room)."}
                </p>
                {assignedClinics.length === 0 && !showAssign && (
                   <button 
                     onClick={() => setShowAssign(true)}
                     className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3"
                   >
                     Link First Location <ArrowRight size={16} />
                   </button>
                )}
                {clinics.length === 0 && (
                   <div className="mt-6 flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 max-w-xs">
                      <AlertCircle size={20} className="text-amber-600 shrink-0" />
                      <div className="text-left">
                         <p className="text-[10px] text-amber-800 font-black uppercase tracking-tight">System Empty</p>
                         <p className="text-[10px] text-amber-700 font-medium">No clinics exist in the system yet. <Link href="/clinics" className="font-black underline">Add some here</Link></p>
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
