'use client';

import React, { useState, useEffect } from 'react';
import { Bike, Search, Phone, ShieldCheck, ShieldX, Star, Clock, X, FileText, AlertCircle, CheckCircle, RefreshCcw } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface Rider {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  selfieUrl: string;
  isActive: boolean;
  isOnline: boolean;
  isProfileComplete: boolean;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
}

const API_URL = 'http://localhost:3000/api/v1/riders';

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked' | 'pending'>('all');
  const [viewingDocs, setViewingDocs] = useState<Rider | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Edit State
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    vehicleType: '',
    vehicleNumber: ''
  });

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/all`);
      if (!res.ok) throw new Error('Failed to fetch riders');
      const data = await res.json();
      setRiders(data);
    } catch (error) {
      console.error('Error fetching riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rider: Rider) => {
    setUpdating(rider.id);
    try {
      const res = await fetchWithAuth(`${API_URL}/${rider.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rider.isActive }),
      });
      if (res.ok) {
        setRiders(prev => prev.map(r => r.id === rider.id ? { ...r, isActive: !rider.isActive } : r));
      }
    } catch (error) {
      console.error('Error updating rider status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRider) return;
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/${editingRider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setRiders(prev => prev.map(r => r.id === editingRider.id ? { ...r, ...editData } : r));
        setEditingRider(null);
      } else {
        alert('Failed to update rider info.');
      }
    } catch (error) {
      console.error('Error updating rider data:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch =
      rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phoneNumber?.includes(searchTerm) ||
      rider.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && rider.isActive && rider.isProfileComplete;
    if (filterStatus === 'blocked') return matchesSearch && !rider.isActive;
    if (filterStatus === 'pending') return matchesSearch && !rider.isProfileComplete;
    return matchesSearch;
  });

  const statusCounts = {
    all: riders.length,
    active: riders.filter(r => r.isActive && r.isProfileComplete).length,
    blocked: riders.filter(r => !r.isActive).length,
    pending: riders.filter(r => !r.isProfileComplete).length,
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Delivery Fleet</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Bike size={16} className="mr-2 text-primary" />
            Manage riders, approvals and verification ({riders.length} total)
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search rider..."
              className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchRiders} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-primary hover:border-primary/20 transition">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-fit mb-6 shadow-sm">
        {([['all', 'All'], ['active', 'Active'], ['pending', 'Pending Setup'], ['blocked', 'Blocked']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${filterStatus === key ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterStatus === key ? 'bg-white/20' : 'bg-gray-100'}`}>{statusCounts[key]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-20 flex justify-center">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : filteredRiders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-[2.5rem] border border-gray-100">
            <Bike size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-bold text-lg">No riders found</p>
          </div>
        ) : (
          filteredRiders.map((rider) => (
            <div key={rider.id} className={`bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/40 border flex flex-col hover:-translate-y-1 transition-transform duration-300 ${!rider.isActive ? 'border-red-100 opacity-80' : 'border-gray-100'}`}>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black uppercase text-lg ${rider.isActive ? 'bg-gradient-to-br from-primary to-orange-700' : 'bg-gray-300'}`}>
                      {rider.name ? rider.name.charAt(0) : '?'}
                    </div>
                    {rider.isOnline && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-[0_0_6px_rgba(34,197,94,0.6)]"></span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{rider.name || 'Setup Pending'}</h3>
                    <p className="text-xs font-bold text-gray-400 tracking-wider">#{rider.id.slice(0, 8)}</p>
                  </div>
                </div>
                {!rider.isActive && (
                  <span className="px-2 py-1 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-100">Blocked</span>
                )}
              </div>

              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center justify-between text-sm p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 flex items-center font-medium"><Phone size={14} className="mr-2" /> Phone</span>
                  <span className="font-bold text-gray-900">{rider.phoneNumber || '—'}</span>
                </div>
                
                {rider.isProfileComplete ? (
                  <>
                    <div className="flex items-center justify-between text-sm p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 flex items-center font-medium"><Bike size={14} className="mr-2" /> Vehicle</span>
                      <span className="font-bold text-gray-900">{rider.vehicleType}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 font-medium">Plate</span>
                      <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs uppercase tracking-widest">{rider.vehicleNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 flex items-center font-medium"><Star size={14} className="mr-2 fill-yellow-400 text-yellow-400" /> Rating</span>
                      <span className="font-bold text-gray-900">{Number(rider.averageRating || 5).toFixed(1)} ({rider.totalReviews || 0})</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 font-medium">Total Earned</span>
                      <span className="font-black text-primary">Rs. {Number(rider.totalEarnings || 0).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <p className="text-sm font-bold text-orange-600 flex items-center">
                      <Clock size={14} className="mr-2" /> Profile Incomplete
                    </p>
                    <p className="text-xs font-medium text-orange-500 mt-1">
                      Rider hasn't submitted vehicle & CNIC details via app yet.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-2">
                <button 
                  onClick={() => {
                    setEditingRider(rider);
                    setEditData({
                      name: rider.name || '',
                      phoneNumber: rider.phoneNumber || '',
                      email: rider.email || '',
                      vehicleType: rider.vehicleType || '',
                      vehicleNumber: rider.vehicleNumber || ''
                    });
                  }}
                  className="flex-1 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl flex items-center justify-center hover:bg-gray-100 transition text-sm border border-gray-200"
                >
                  Edit Info
                </button>
                {rider.isProfileComplete && (
                  <button 
                    onClick={() => setViewingDocs(rider)}
                    className="flex-[1.5] py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition text-sm border border-blue-100"
                  >
                    <FileText size={15} className="mr-1.5" /> View Docs
                  </button>
                )}
                <button
                  disabled={updating === rider.id}
                  onClick={() => handleToggleActive(rider)}
                  className={`flex-1 py-2.5 font-bold rounded-xl flex items-center justify-center transition text-sm border ${
                    rider.isActive
                      ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-500 hover:text-white'
                      : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-500 hover:text-white'
                  } ${updating === rider.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {updating === rider.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : rider.isActive ? (
                    <><ShieldX size={15} className="mr-1.5" /> Block</>
                  ) : (
                    <><ShieldCheck size={15} className="mr-1.5" /> Unblock</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Documents Modal */}
      {viewingDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setViewingDocs(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Rider Documents</h2>
                <p className="text-sm font-bold text-gray-400 mt-1">{viewingDocs.name} — #{viewingDocs.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {viewingDocs.selfieUrl && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Rider Selfie</p>
                  <img src={viewingDocs.selfieUrl} alt="Rider Selfie" className="w-32 h-32 rounded-2xl object-cover border border-gray-100" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {viewingDocs.cnicFrontUrl ? (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CNIC Front</p>
                    <img src={viewingDocs.cnicFrontUrl} alt="CNIC Front" className="w-full rounded-2xl object-cover border border-gray-100 aspect-video" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl aspect-video border border-dashed border-gray-200">
                    <AlertCircle size={24} className="text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400 font-bold">CNIC Front Missing</p>
                  </div>
                )}
                {viewingDocs.cnicBackUrl ? (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CNIC Back</p>
                    <img src={viewingDocs.cnicBackUrl} alt="CNIC Back" className="w-full rounded-2xl object-cover border border-gray-100 aspect-video" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl aspect-video border border-dashed border-gray-200">
                    <AlertCircle size={24} className="text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400 font-bold">CNIC Back Missing</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => {
                  handleToggleActive(viewingDocs);
                  setViewingDocs(null);
                }}
                className={`w-full py-4 font-black rounded-2xl flex items-center justify-center text-lg transition ${
                  viewingDocs.isActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {viewingDocs.isActive ? <><ShieldX size={20} className="mr-2" /> Block This Rider</> : <><ShieldCheck size={20} className="mr-2" /> Approve & Unblock Rider</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rider Info Modal */}
      {editingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingRider(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Edit Rider Info</h2>
                <p className="text-sm font-bold text-gray-400 mt-1">#{editingRider.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setEditingRider(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold"
                  value={editData.name}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold"
                  value={editData.phoneNumber}
                  onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold"
                  value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Vehicle Type</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold"
                    value={editData.vehicleType}
                    onChange={(e) => setEditData({...editData, vehicleType: e.target.value})}
                  >
                    <option value="Bike">Bike</option>
                    <option value="Cycle">Cycle</option>
                    <option value="Scooter">Scooter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Plate Number</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold uppercase"
                    value={editData.vehicleNumber}
                    onChange={(e) => setEditData({...editData, vehicleNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingRider(null)}
                className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-orange-600 transition disabled:opacity-50 flex flex-1 items-center justify-center"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
