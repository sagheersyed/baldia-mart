'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Send, RefreshCw, Bell, History, ShieldAlert, CheckCircle, Users } from 'lucide-react';
import { fetchWithAuth, BASE_URL, getErrorMessage, parseApiError } from '@/lib/api';
import { showToast } from '@/hooks/useToast';

export default function MarketingPage() {
  const [title,   setTitle]   = useState('');
  const [message, setMessage] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [status,  setStatus]  = useState<{ text: string; ok: boolean } | null>(null);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

  const fetchRecentBroadcasts = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/notifications/broadcast/recent?limit=8`);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch broadcasts'));
      const data = await res.json();
      setRecentBroadcasts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load recent broadcasts:', err);
    }
  };

  useEffect(() => { fetchRecentBroadcasts(); }, []);

  const handleBroadcast = async () => {
    if (!title || !message) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Broadcast failed'));
      const data = await res.json();
      setStatus({ text: `Sent to ${data?.targetedUsers ?? 'all'} customers`, ok: true });
      showToast({ title: `Broadcast sent (${data?.targetedUsers ?? 0} users)`, variant: 'success' });
      setTitle(''); setMessage('');
      fetchRecentBroadcasts();
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      setStatus({ text: getErrorMessage(err, 'Failed to send broadcast'), ok: false });
      showToast({ title: getErrorMessage(err, 'Broadcast failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone size={22} className="text-primary-600" /> Marketing & Notifications
          </h1>
          <p className="page-subtitle">Send global push notifications to all customers</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="md:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Send size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Broadcast Composer</h2>
              <p className="text-xs text-slate-500">Message all registered customers</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {status && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${status.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {status.ok ? <CheckCircle size={17} className="mt-0.5 shrink-0" /> : <Bell size={17} className="mt-0.5 shrink-0" />}
                <p className="text-sm font-medium">{status.text}</p>
              </div>
            )}

            <div>
              <label className="input-label">Notification Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g. Flash Sale Alert! ⚡"
              />
            </div>

            <div>
              <label className="input-label">Message Body</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input resize-none"
                placeholder="Compose your message to all customers…"
              />
            </div>

            <button
              onClick={handleBroadcast}
              disabled={saving || !title || !message}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {saving
                ? <><RefreshCw size={17} className="animate-spin" /> Sending…</>
                : <><Megaphone size={17} /> Send Global Broadcast</>}
            </button>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-5">
          <div className="card p-5 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldAlert size={16} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Use With Caution</h3>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Broadcasts reach all registered customers. Excessive notifications can lead to app uninstalls. Limit to 1–2 per week.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <History size={16} className="text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Broadcasts</h3>
                <p className="text-xs text-slate-500">Last 8 campaigns</p>
              </div>
            </div>

            <div className="space-y-3">
              {recentBroadcasts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 italic">No broadcasts yet</p>
              ) : recentBroadcasts.map((item, idx) => (
                <div key={`${item.createdAt}-${idx}`} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                  {item.body && <p className="text-xs text-slate-500 truncate mt-0.5">{item.body}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      <Users size={9} /> {Number(item.recipientCount || 0)} recipients
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
