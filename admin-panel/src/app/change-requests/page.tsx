'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BASE_URL, fetchWithAuth, parseApiError } from '@/lib/api';
import { 
  ClipboardList, CheckCircle, XCircle, Clock, 
  ChevronRight, AlertCircle 
} from 'lucide-react';

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/cms/change-requests/admin/queue?status=${filter}`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch requests'));
      const data = await res.json();
      setRequests(data.data ? data.data : (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Change Requests</h1>
          <p className="text-slate-500 text-sm">Review and approve merchant catalog updates</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          {['pending', 'approved', 'rejected', 'auto_approved'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === s 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50'
                }
              `}
            >
              {s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <ClipboardList size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm mt-1">
            There are no {filter} change requests to show right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {requests.map((req) => (
            <Link 
              key={req.id} 
              href={`/change-requests/${req.id}`}
              className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                    req.status === 'approved' ? 'bg-green-50 text-green-600' : 
                    'bg-slate-50 text-slate-600'}
                `}>
                  {req.status === 'pending' ? <Clock size={24} /> : 
                   req.status === 'approved' ? <CheckCircle size={24} /> : 
                   <XCircle size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                      {req.entityName || req.entityType} {req.actionType === 'CREATE' ? 'Request' : 'Update'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
                      {req.entityType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{req.tenant?.name || 'Unknown Store'}</span>
                    <span>•</span>
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-900">
                    {(() => {
                      const data = req.patchData;
                      if (!data) return 'N/A';
                      
                      // Case 1: Simple object (Create)
                      if (!Array.isArray(data)) {
                        return data.price ? `₨ ${data.price}` : 'Item Info';
                      }
                      
                      // Case 2: JSON Patch (Update)
                      if (data.length === 1) {
                        const op = data[0];
                        if (op.path === '/price' || op.path === '/priceOverride') return `₨ ${op.value}`;
                        if (op.path === '/stockQty' || op.path === '/stockQuantity') return `Stock: ${op.value}`;
                        return op.path.replace(/^\//, '');
                      }
                      
                      return `${data.length} Fields`;
                    })()}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                    Proposed Value
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
