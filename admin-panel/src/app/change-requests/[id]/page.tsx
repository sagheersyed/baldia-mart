'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BASE_URL, fetchWithAuth, parseApiError, normalizeUrl } from '@/lib/api';
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, 
  AlertCircle, ChevronRight, Store, User, 
  MessageSquare, Send 
} from 'lucide-react';

export default function ChangeRequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [crRes, discRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/cms/change-requests/${id}`),
        fetchWithAuth(`${BASE_URL}/cms/change-requests/${id}/discussions`)
      ]);

      if (!crRes.ok) throw new Error(await parseApiError(crRes, 'Failed to fetch request detail'));
      
      setRequest(await crRes.json());
      if (discRes.ok) setDiscussions(await discRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    const reason = status === 'rejected' 
      ? window.prompt(`Please provide a reason for rejection:`)
      : window.prompt(`Add an optional approval note:`);
    
    if (status === 'rejected' && !reason) return;

    setActionLoading(true);
    try {
      const endpoint = status === 'approved' ? 'approve' : 'reject';
      const res = await fetchWithAuth(`${BASE_URL}/cms/change-requests/admin/${id}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status === 'rejected' ? { reason } : {})
      });

      if (!res.ok) throw new Error(await parseApiError(res, `Failed to ${status}`));
      
      alert(`Request has been ${status} successfully.`);
      router.push('/change-requests');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/cms/change-requests/${id}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment })
      });
      if (res.ok) {
        setComment('');
        fetchData();
      }
    } catch (e) {}
  };

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading request details...</div>;
  if (error) return <div className="p-12 text-center text-red-500 font-medium">{error}</div>;
  if (!request) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Request Details</h1>
          <p className="text-slate-500 text-xs">CR-{request.id.toString().slice(-6).toUpperCase()}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {['submitted', 'under_review'].includes(request.status) ? (
            <>
              <button 
                onClick={() => handleAction('rejected')}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-bold transition-all disabled:opacity-50"
              >
                Reject
              </button>
              <button 
                onClick={() => handleAction('approved')}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold shadow-md shadow-slate-900/20 transition-all disabled:opacity-50"
              >
                Approve Request
              </button>
            </>
          ) : (
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
              request.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {request.status === 'approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {request.status.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data Review */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-slate-900" />
                Proposed Changes
              </h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold">
                {request.actionType}
              </span>
            </div>
            
            <div className="p-6">
              <div className="flex gap-6 mb-8">
                {request.patchData?.imageUrl && (
                  <img 
                    src={normalizeUrl(request.patchData.imageUrl)} 
                    className="w-32 h-32 rounded-2xl object-cover border border-slate-100 bg-slate-50" 
                    alt="Proposed" 
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Request For</div>
                  <div className="text-lg font-bold text-slate-900">
                    {request.preChangeSnapshot?.name || request.patchData?.name || request.entityType}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    {request.entityType} • {request.entityId || 'NEW_RECORD'}
                  </div>
                </div>
              </div>

                <div className="grid grid-cols-3 gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2">
                  <div>Field</div>
                  <div>Old Value</div>
                  <div>New Value</div>
                </div>
                
                {Array.isArray(request.patchData) ? (
                  // JSON Patch Format (Update)
                  request.patchData.map((op: any, index: number) => (
                    <div key={index} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <div className="text-sm font-medium text-slate-500 font-mono">
                        {op.path.replace(/^\//, '')}
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 rounded px-1">{op.op.toUpperCase()}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-400 italic">
                        {op.oldValue !== undefined ? String(op.oldValue) : '—'}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {typeof op.value === 'boolean' ? (op.value ? 'YES' : 'NO') : String(op.value)}
                      </div>
                    </div>
                  ))
                ) : (
                  // Flat Object Format (Create)
                  Object.entries(request.patchData || {}).map(([key, value]: [string, any]) => {
                    if (key === 'imageUrl') return null;
                    return (
                      <div key={key} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-slate-50 last:border-0">
                        <div className="text-sm font-medium text-slate-500">{key}</div>
                        <div className="text-sm font-medium text-slate-400 italic">—</div>
                        <div className="text-sm font-bold text-slate-900">
                          {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Discussions */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                <MessageSquare size={18} className="text-slate-400" />
                <h3 className="font-bold text-slate-900">Internal Discussion</h3>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                {discussions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">No messages yet</div>
                ) : (
                  discussions.map((msg: any) => (
                    <div key={msg.id} className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-1">
                        <span>{msg.author?.name || 'Admin'}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className={`rounded-2xl rounded-tl-none px-4 py-2 border max-w-[80%] text-sm ${
                        msg.authorId ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a note or feedback..." 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postComment()}
                />
                <button 
                  onClick={postComment}
                  className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

        {/* Right Column: Context */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-widest">Store Info</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Store size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">{request.tenant?.name || 'Unknown Store'}</div>
                <div className="text-[10px] text-slate-500 font-medium">Merchant ID: {request.tenantId}</div>
              </div>
            </div>
            
            <hr className="border-slate-100" />
            
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-widest">Requested By</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">{request.requester?.name || 'Merchant'}</div>
                <div className="text-[10px] text-slate-500 font-medium">Internal User</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-3 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Status Timeline</h4>
              <div className="space-y-4 pt-2">
                <Step label="Submitted" date={request.createdAt} active />
                <Step label="Admin Review" active={request.status !== 'submitted'} />
                <Step label={request.status === 'rejected' ? 'Rejected' : 'Published'} active={['approved', 'rejected', 'published', 'auto_approved'].includes(request.status)} />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ label, date, active }: { label: string; date?: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-4 h-4 rounded-full border-2 border-white mt-1 ${active ? 'bg-white shadow-[0_0_8px_white]' : 'bg-transparent opacity-30'}`} />
      <div>
        <div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400 opacity-50'}`}>{label}</div>
        {date && <div className="text-[10px] text-slate-400 mt-0.5">{new Date(date).toLocaleDateString()}</div>}
      </div>
    </div>
  );
}
