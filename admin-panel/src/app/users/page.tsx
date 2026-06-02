'use client';

import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Mail, Phone, Calendar, Ban, CheckCircle, UserX, UserCheck, RefreshCw } from 'lucide-react';
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
      showToast({ title: `User ${user.isActive ? 'blocked' : 'unblocked'}`, variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Failed to update user status'), variant: 'error' });
    } finally {
      setUpdating(null);
    }
  };

  const customers = users.filter(u =>
    u.role !== 'admin' && (
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phoneNumber?.includes(searchTerm) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your platform's user base · {customers.length} customers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search name, phone, email…"
              className="input pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchUsers} className="btn-ghost btn-icon">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState message="Loading customers…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchUsers} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            message="Try adjusting your search."
            icon={<UsersIcon size={24} className="text-slate-300" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${user.isActive !== false ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-slate-300'}`}>
                          {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{user.name || 'Anonymous'}</p>
                          <p className="text-xs text-slate-400">#{user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {user.phoneNumber ? (
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={11} className="text-slate-400" />
                            {user.phoneNumber}
                            {user.isPhoneVerified && <CheckCircle size={10} className="text-emerald-500" />}
                          </p>
                        ) : <p className="text-xs text-slate-300 italic">No phone</p>}
                        {user.email && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail size={11} className="text-slate-400" />
                            {user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      {user.isActive !== false ? (
                        <span className="badge-green"><CheckCircle size={10} /> Active</span>
                      ) : (
                        <span className="badge-red"><Ban size={10} /> Suspended</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        disabled={updating === user.id}
                        onClick={() => handleToggleActive(user)}
                        className={user.isActive !== false ? 'btn-danger' : 'btn-success'}
                      >
                        {updating === user.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : user.isActive !== false ? (
                          <><UserX size={13} /> Block</>
                        ) : (
                          <><UserCheck size={13} /> Unblock</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
