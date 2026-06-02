'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, Pencil, Stethoscope, Search, 
  User, Award, Briefcase, GraduationCap, DollarSign, Image as ImageIcon,
  CalendarDays, XCircle
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError, normalizeUrl } from '@/lib/api';
import { showToast } from '@/hooks/useToast';
import ScheduleBuilderModal from '@/components/ScheduleBuilderModal';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  degree?: string;
  experienceYears: number;
  hospital?: string;
  biography?: string;
  consultationFee: number;
  rating: number;
  imageUrl?: string;
  isActive: boolean;
}

const API_URL = `${BASE_URL}/pharma/telemedicine/doctors`;
const ADMIN_API_URL = `${BASE_URL}/pharma/telemedicine/admin/doctors`;

const EMPTY_FORM = {
  name: '',
  specialization: '',
  degree: '',
  experienceYears: '0',
  hospital: '',
  clinicAddress: '',
  biography: '',
  consultationFee: '',
  imageUrl: '',
  isActive: true,
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvailability, setShowAvailability] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load doctors'));
      const payload = await res.json();
      const data = Array.isArray(payload) ? payload : (payload.data || []);
      setDoctors(data);
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to load doctors'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId ? `${ADMIN_API_URL}/${editingId}` : ADMIN_API_URL;
      const method = editingId ? 'PUT' : 'POST';
      
      const body = {
        ...formData,
        experienceYears: parseInt(formData.experienceYears),
        consultationFee: parseFloat(formData.consultationFee),
      };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        fetchDoctors();
        showToast({ title: editingId ? 'Doctor updated' : 'Doctor added', variant: 'success' });
      } else {
        showToast({ title: await parseApiError(res, 'Failed to save doctor'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to save doctor'), variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (d: Doctor) => {
    setEditingId(d.id);
    setFormData({
      name: d.name,
      specialization: d.specialization,
      degree: d.degree || '',
      experienceYears: d.experienceYears.toString(),
      hospital: d.hospital || '',
      clinicAddress: (d as any).clinicAddress || '',
      biography: d.biography || '',
      consultationFee: d.consultationFee.toString(),
      imageUrl: d.imageUrl || '',
      isActive: d.isActive,
    });
    setShowModal(true);
  };

  const handleEmergencyCancel = async (doctorId: string) => {
    const reason = prompt('Please enter the reason for emergency cancellation:');
    if (!reason) return;
    
    try {
      const res = await fetchWithAuth(`${ADMIN_API_URL}/${doctorId}/emergency-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        showToast({ title: 'Emergency cancellation processed', variant: 'success' });
        fetchDoctors();
      }
    } catch {
      showToast({ title: 'Operation failed', variant: 'error' });
    }
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title text-teal-700">Medical Specialists</h1>
          <p className="page-subtitle">Manage doctors available for video consultations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search doctors..."
              className="input pl-10 w-64 border-teal-100 focus:border-teal-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <Plus size={18} /> Add Doctor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-20 bg-slate-50 rounded" />
            </div>
          ))
        ) : filteredDoctors.length === 0 ? (
          <div className="col-span-full card p-20 text-center text-slate-400">
            <Stethoscope className="mx-auto mb-4 opacity-10" size={80} />
            <p>No doctors found. Add your first specialist to get started.</p>
          </div>
        ) : filteredDoctors.map(doctor => (
          <div key={doctor.id} className="card group hover:border-teal-500 transition-all border-2 border-transparent">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 overflow-hidden flex items-center justify-center">
                    {doctor.imageUrl ? (
                      <img src={normalizeUrl(doctor.imageUrl)} className="w-full h-full object-cover" alt={doctor.name} />
                    ) : (
                      <User size={30} className="text-teal-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Dr. {doctor.name}</h3>
                    <p className="text-teal-600 font-semibold text-sm">{doctor.specialization}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEmergencyCancel(doctor.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Emergency Cancel All"><XCircle size={16} /></button>
                  <button onClick={() => setShowAvailability({ id: doctor.id, name: doctor.name })} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Manage Slots"><CalendarDays size={16} /></button>
                  <button onClick={() => handleEdit(doctor)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit Doctor"><Pencil size={16} /></button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Experience</p>
                  <p className="text-sm text-slate-700 flex items-center gap-1.5 font-medium">
                    <Briefcase size={14} className="text-slate-400" /> {doctor.experienceYears} Years
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Consultation Fee</p>
                  <p className="text-sm text-teal-700 flex items-center gap-1.5 font-black">
                    Rs. {Number(doctor.consultationFee).toFixed(0)}
                  </p>
                </div>
              </div>

              {doctor.hospital && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Current Hospital</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                    <Award size={14} className="text-slate-400" /> {doctor.hospital}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                 {doctor.isActive ? 'Available' : 'Unavailable'}
               </span>
               <div className="flex items-center gap-1 text-amber-500">
                 <Star fill="currentColor" size={12} />
                 <span className="text-xs font-black">{Number(doctor.rating).toFixed(1)}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-teal-50 bg-teal-50/30">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Stethoscope className="text-teal-600" size={20} />
                {editingId ? 'Edit Doctor Profile' : 'Register New Specialist'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required className="input pl-10" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. Sarah Ahmed" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Specialization *</label>
                  <select required className="input" value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })}>
                    <option value="">Select Specialty</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Dermatologist">Dermatologist</option>
                    <option value="Gynecologist">Gynecologist</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Psychiatrist">Psychiatrist</option>
                    <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                    <option value="Dentist">Dentist</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Degree / Qualifications</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input className="input pl-10" value={formData.degree} onChange={e => setFormData({ ...formData, degree: e.target.value })} placeholder="MBBS, MD (UK)" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Experience (Years)</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="number" className="input pl-10" value={formData.experienceYears} onChange={e => setFormData({ ...formData, experienceYears: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Current Hospital</label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input className="input pl-10" value={formData.hospital} onChange={e => setFormData({ ...formData, hospital: e.target.value })} placeholder="Agha Khan Hospital" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Clinic Address (for onsite visits)</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input className="input pl-10" value={formData.clinicAddress} onChange={e => setFormData({ ...formData, clinicAddress: e.target.value })} placeholder="Shop 12, Baldia Mart Area" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Consultation Fee (Rs.) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="number" className="input pl-10 font-bold" value={formData.consultationFee} onChange={e => setFormData({ ...formData, consultationFee: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <label className="input-label">Profile Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input className="input pl-10" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://image-hosting.com/dr-profile.jpg" />
                </div>
              </div>

              <div>
                <label className="input-label">Short Biography</label>
                <textarea className="input min-h-[80px] py-2" value={formData.biography} onChange={e => setFormData({ ...formData, biography: e.target.value })} placeholder="Brief background of the doctor..." />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="doctor-active" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                <label htmlFor="doctor-active" className="text-sm font-bold text-slate-700 cursor-pointer">Doctor is Active & Ready for Bookings</label>
              </div>

              <div className="modal-footer border-t border-slate-100 pt-6">
                <button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-100 transition-all disabled:opacity-50">
                  {isSubmitting ? 'Saving Specialist...' : editingId ? 'Update Profile' : 'Register Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAvailability && (
        <ScheduleBuilderModal 
          doctorId={showAvailability.id} 
          doctorName={showAvailability.name} 
          onClose={() => setShowAvailability(null)} 
        />
      )}
    </div>
  );
}

function Star({ fill, size, className }: { fill?: string, size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={fill || "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
