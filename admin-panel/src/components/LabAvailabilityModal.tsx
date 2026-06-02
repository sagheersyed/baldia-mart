'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, RefreshCw, Users } from 'lucide-react';
import { fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

interface LabAvailabilityModalProps {
  onClose: () => void;
}

export default function LabAvailabilityModal({ onClose }: LabAvailabilityModalProps) {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '', endTime: '', maxCapacity: 10 });

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/lab/availability`);
      if (res.ok) setSlots(await res.json());
    } catch (e) {
      showToast({ title: 'Failed to load slots', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      showToast({ title: 'Please fill all fields', variant: 'info' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/lab/admin/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: [newSlot] })
      });
      if (res.ok) {
        setNewSlot({ date: '', startTime: '', endTime: '', maxCapacity: 10 });
        fetchSlots();
        showToast({ title: 'Lab slot added', variant: 'success' });
      }
    } catch (e) {
      showToast({ title: 'Failed to add slot', variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/lab/admin/availability/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSlots(prev => prev.filter(s => s.id !== id));
        showToast({ title: 'Slot removed', variant: 'success' });
      }
    } catch (e) {
      showToast({ title: 'Error removing slot', variant: 'error' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header bg-purple-50 border-b border-purple-100">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-purple-600" size={18} />
              Global Lab Availability
            </h2>
            <p className="text-xs text-purple-600 font-medium">Manage collection slots for all tests</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={18} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Add New Slot */}
          <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Date</label>
                <input type="date" className="input text-xs py-1.5" value={newSlot.date} onChange={e => setNewSlot({...newSlot, date: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Capacity (Patients)</label>
                <input type="number" className="input text-xs py-1.5" value={newSlot.maxCapacity} onChange={e => setNewSlot({...newSlot, maxCapacity: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Start Time</label>
                <input type="time" className="input text-xs py-1.5" value={newSlot.startTime} onChange={e => setNewSlot({...newSlot, startTime: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">End Time</label>
                <input type="time" className="input text-xs py-1.5" value={newSlot.endTime} onChange={e => setNewSlot({...newSlot, endTime: e.target.value})} />
              </div>
            </div>
            <button 
              onClick={handleAddSlot}
              disabled={adding}
              className="w-full bg-purple-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
            >
              {adding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Lab Collection Slot
            </button>
          </div>

          {/* Slots List */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-800">Current Collection Slots</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">Loading slots...</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs">
                  No slots defined.
                </div>
              ) : slots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{slot.date}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{slot.startTime} - {slot.endTime}</p>
                    </div>
                    <div className="ml-4 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Users size={10} /> {slot.currentBookings} / {slot.maxCapacity}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
