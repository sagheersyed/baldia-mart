'use client';

import React, { useState } from 'react';
import { Megaphone, Send, RefreshCw, Bell, History, ShieldAlert } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

export default function MarketingPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleBroadcast = async () => {
    if (!title || !message) return;
    try {
      setSaving(true);
      const res = await fetchWithAuth('http://192.168.100.142:3000/api/v1/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      });

      if (!res.ok) throw new Error('Broadcast failed');

      setStatus('Success! Notification sent to all customers.');
      setTitle('');
      setMessage('');
      setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      console.error('Broadcast failed:', error);
      setStatus('Error: Failed to send broadcast.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
          <Megaphone className="mr-4 text-primary" size={40} />
          Marketing & Engagement
        </h1>
        <p className="text-gray-500 mt-2 font-medium italic">
          Drive sales and keep customers engaged with global push notifications.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Composer Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center space-x-3 bg-gray-50/30">
              <Send className="text-primary" size={20} />
              <h2 className="text-xl font-black text-gray-900 underline decoration-primary/20 underline-offset-4">
                Global Notification Composer
              </h2>
            </div>

            <div className="p-8 space-y-6">
              {status && (
                <div className={`p-4 rounded-2xl flex items-center space-x-3 font-bold text-sm ${status.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                  <Bell size={18} />
                  <span>{status}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Notification Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold"
                    placeholder="e.g. Flash Sale Alert! ⚡"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Message Body</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-bold resize-none"
                    placeholder="Componse your message here for all customers..."
                  />
                </div>
                <button
                  onClick={handleBroadcast}
                  disabled={saving || !title || !message}
                  className="w-full py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-[2rem] font-black text-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3"
                >
                  {saving ? (
                    <RefreshCw className="animate-spin" size={24} />
                  ) : (
                    <>
                      <Megaphone size={24} />
                      <span>Send Global Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info/Warning Sidebar */}
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem]">
            <ShieldAlert className="text-orange-500 mb-4" size={32} />
            <h3 className="text-lg font-black text-orange-900 mb-2 underline decoration-orange-200 underline-offset-4">Cautionary Note</h3>
            <p className="text-sm text-orange-800 leading-relaxed font-medium">
              Broadcasting reaches **all registered customers**. Excessive notifications can lead to app uninstalls. We recommend no more than 1-2 marketing broadcasts per week.
            </p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/40">
            <History className="text-gray-400 mb-4" size={32} />
            <h3 className="text-lg font-black text-gray-900 mb-2 underline decoration-gray-100 underline-offset-4">Recent Activity</h3>
            <div className="space-y-3 mt-4 text-xs font-bold text-gray-400">
              <div className="flex justify-between items-center py-2 border-b border-gray-50 italic">
                <span>No recent broadcasts</span>
                <span>--:--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
