'use client';

import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Mail, Phone, Calendar, Ban, CheckCircle, UserX, UserCheck, RefreshCcw } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

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

const API_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/users/all';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    setUpdating(user.id);
    try {
      const res = await fetchWithAuth(`https://c2e9-175-107-236-228.ngrok-free.app/api/v1/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.includes(searchTerm) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customers = filteredUsers.filter(u => u.role !== 'admin');

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Customers</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <UsersIcon size={16} className="mr-2 text-primary" />
            Manage your platform's user base ({customers.length} customers)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchUsers} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-primary hover:border-primary/20 transition">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-bold text-lg">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 uppercase text-xs font-black tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="px-8 py-5">Customer Info</th>
                  <th className="px-8 py-5">Contact</th>
                  <th className="px-8 py-5">Joined Date</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black uppercase ${user.isActive ? 'bg-gradient-to-br from-primary/80 to-primary' : 'bg-gray-300'}`}>
                          {user.name ? user.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900">{user.name || 'Anonymous User'}</p>
                          <p className="text-xs text-gray-400 font-bold tracking-wide">#{user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        {user.phoneNumber ? (
                          <p className="flex items-center text-sm font-medium text-gray-600">
                            <Phone size={14} className="mr-2 text-gray-400" />
                            {user.phoneNumber}
                            {user.isPhoneVerified && <CheckCircle size={12} className="ml-1.5 text-green-500" />}
                          </p>
                        ) : <p className="text-sm text-gray-300 font-medium italic">No phone</p>}
                        {user.email && (
                          <p className="flex items-center text-sm font-medium text-gray-600">
                            <Mail size={14} className="mr-2 text-gray-400" /> {user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-600">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2 text-gray-400" />
                        {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {user.isActive !== false ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border bg-green-50 text-green-600 border-green-200">
                          <CheckCircle size={12} className="mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-200">
                          <Ban size={12} className="mr-1" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        disabled={updating === user.id}
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${user.isActive
                          ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-500 hover:text-white'
                          : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-500 hover:text-white'
                          } ${updating === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {updating === user.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : user.isActive ? (
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
