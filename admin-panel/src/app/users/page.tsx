'use client';

import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Mail, Phone, Calendar, Ban, CheckCircle, UserX, UserCheck, RefreshCw, Shield } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '@/components/PageState';
import { showToast } from '@/hooks/useToast';

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

const API_URL = `${BASE_URL}/users/all`;

export default function UsersPage() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [segment,    setSegment]    = useState<'all' | 'active' | 'suspended'>('all');
  const { loading, error, execute } = useAsyncData();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    await execute(async () => {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch users'));
      const data = await res.json();
      setUsers(data);
      return data;
    });
  };

  const handleToggleActive = async (user: User) => {
    setUpdating(user.id);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update user status'));
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
      showToast({ title: `User ${user.isActive ? 'suspended' : 'reinstated'}`, variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update user status'), variant: 'error' });
    } finally {
      setUpdating(null);
    }
  };

  const customers = users.filter(u => {
    if (u.role === 'admin') return false;
    const matchSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phoneNumber?.includes(searchTerm) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSegment = segment === 'all' || (segment === 'active' && u.isActive !== false) || (segment === 'suspended' && u.isActive === false);
    return matchSearch && matchSegment;
  });

  const activeCount = users.filter(u => u.role !== 'admin' && u.isActive !== false).length;
  const suspendedCount = users.filter(u => u.role !== 'admin' && u.isActive === false).length;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-8 pb-4">
      {/* Strategic Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2 border-b border-slate-100/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
              <UsersIcon size={24} className="text-primary-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Identity Vault</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Platform User Registry · Access Control Matrix</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search entity..."
              className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={fetchUsers}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metric Ribbon */}
      <div className="grid grid-cols-3 gap-6 shrink-0">
        {[
          { label: 'Total Entities', value: users.filter(u => u.role !== 'admin').length, seg: 'all' as const, color: 'from-slate-800 to-slate-950' },
          { label: 'Active Clearance', value: activeCount, seg: 'active' as const, color: 'from-emerald-500 to-teal-600' },
          { label: 'Suspended', value: suspendedCount, seg: 'suspended' as const, color: 'from-rose-500 to-red-600' },
        ].map(m => (
          <button
            key={m.seg}
            onClick={() => setSegment(m.seg)}
            className={`group relative p-8 rounded-[2.5rem] border transition-all overflow-hidden text-left ${
              segment === m.seg
                ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/30'
                : 'bg-white border-slate-100/60 hover:border-primary-200 hover:shadow-xl'
            }`}
          >
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${segment === m.seg ? 'text-white/40' : 'text-slate-300'}`}>{m.label}</p>
            <p className={`text-3xl font-black tracking-tighter mt-2 ${segment === m.seg ? 'text-white' : 'text-slate-900'}`}>{m.value.toLocaleString()}</p>
            <div className={`absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br ${m.color} opacity-[0.06] rounded-full blur-2xl`} />
          </button>
        ))}
      </div>

      {/* Data Grid */}
      <div className="flex-1 min-h-0 card !p-0 !rounded-[3rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/30 flex flex-col overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center"><RefreshCw className="animate-spin text-primary-500 mb-6" size={48} /><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Syncing Registry...</p></div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchUsers} />
        ) : customers.length === 0 ? (
          <div className="py-32 flex flex-col items-center opacity-40">
            <UsersIcon size={64} className="text-slate-200 mb-6" />
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">No entities match criteria</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/80 backdrop-blur-xl border-b border-slate-100">
                  <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Entity</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Contact Protocol</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Registration</th>
                  <th className="text-center px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Clearance</th>
                  <th className="text-right px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg ${
                          user.isActive !== false
                            ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/20'
                            : 'bg-slate-300 shadow-slate-300/20'
                        }`}>
                          {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-slate-900 uppercase italic tracking-tight truncate">{user.name || 'Anonymous Entity'}</p>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">SYS · {user.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-2">
                        {user.phoneNumber ? (
                          <p className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <Phone size={12} className="text-slate-300" />
                            {user.phoneNumber}
                            {user.isPhoneVerified && (
                              <span className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle size={10} className="text-emerald-600" />
                              </span>
                            )}
                          </p>
                        ) : <p className="text-[10px] text-slate-300 italic font-bold">NULL CONTACT</p>}
                        {user.email && (
                          <p className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                            <Mail size={11} className="text-slate-200" />
                            {user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-200" />
                        <span className="text-[11px] font-bold text-slate-500">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {user.isActive !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          <Shield size={12} /> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100">
                          <Ban size={12} /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        disabled={updating === user.id}
                        onClick={() => handleToggleActive(user)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-sm ${
                          user.isActive !== false
                            ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {updating === user.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : user.isActive !== false ? (
                          <span className="flex items-center gap-2"><UserX size={14} /> Revoke</span>
                        ) : (
                          <span className="flex items-center gap-2"><UserCheck size={14} /> Reinstate</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Stats */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customers.length} Entities Displayed</p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{activeCount} Active</span>
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{suspendedCount} Suspended</span>
          </div>
        </div>
      </div>
    </div>
  );
}
