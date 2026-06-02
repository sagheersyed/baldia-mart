'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, AlertTriangle, Search, RefreshCw, ChevronLeft, ChevronRight,
  FileText, User, ShoppingBag, Clock, Filter, Activity, AlertCircle, Info
} from 'lucide-react';
import { fetchWithAuth, BASE_URL, parseApiError } from '@/lib/api';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  prescription_uploaded: { label: 'Prescription Uploaded', icon: '📤' },
  prescription_approved: { label: 'Rx Approved', icon: '✅' },
  prescription_rejected: { label: 'Rx Rejected', icon: '❌' },
  prescription_auto_expired: { label: 'Rx Auto-Expired', icon: '⏰' },
  prescription_validity_expired: { label: 'Rx Validity Expired', icon: '📅' },
  quotation_generated: { label: 'Quotation Generated', icon: '💰' },
  quotation_accepted: { label: 'Quotation Accepted', icon: '🤝' },
  quotation_rejected: { label: 'Quotation Rejected', icon: '🚫' },
  quotation_expired: { label: 'Quotation Expired', icon: '⏳' },
  controlled_purchase_attempt: { label: 'Controlled Substance', icon: '⚠️' },
  age_restricted_blocked: { label: 'Age Restriction Block', icon: '🔞' },
  expired_medicine_blocked: { label: 'Expired Med Blocked', icon: '💊' },
  duplicate_order_blocked: { label: 'Duplicate Blocked', icon: '🔄' },
  dosage_limit_exceeded: { label: 'Dosage Limit', icon: '📊' },
  substitution_accepted: { label: 'Substitution Accepted', icon: '🔄' },
  substitution_rejected: { label: 'Substitution Rejected', icon: '↩️' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `${BASE_URL}/pharma/compliance/logs?page=${page}&limit=${limit}`;
      if (severityFilter) url += `&severity=${severityFilter}`;
      if (eventTypeFilter) url += `&eventType=${eventTypeFilter}`;
      
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch audit logs'));
      const data = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, eventTypeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/pharma/compliance/stats`);
      if (res.ok) setStats(await res.json());
    } catch (e) { /* non-critical */ }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2 text-slate-800">
            <ShieldCheck size={22} className="text-emerald-600" />
            Compliance Audit Log
          </h1>
          <p className="page-subtitle">Immutable record of all pharmaceutical compliance events</p>
        </div>
        <button onClick={() => { fetchLogs(); fetchStats(); }} className="btn-ghost flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Events</p>
              <p className="text-xl font-bold text-slate-900">{stats.totalLogs?.toLocaleString()}</p>
            </div>
          </div>
          <div className={`card p-4 flex items-center gap-3 ${stats.criticalCount > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Critical Alerts</p>
              <p className="text-xl font-bold text-red-600">{stats.criticalCount}</p>
            </div>
          </div>
          <div className="card p-4 col-span-2">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Top Event Types</p>
            <div className="flex flex-wrap gap-2">
              {stats.eventBreakdown?.slice(0, 5).map((e: any) => {
                const evInfo = EVENT_LABELS[e.eventType] || { label: e.eventType, icon: '📋' };
                return (
                  <button
                    key={e.eventType}
                    onClick={() => { setEventTypeFilter(e.eventType); setPage(1); }}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition flex items-center gap-1"
                  >
                    <span>{evInfo.icon}</span> {evInfo.label} <span className="font-bold text-slate-900">{e.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Critical Alerts */}
      {stats?.recentCritical?.length > 0 && (
        <div className="card p-4 border-red-200 bg-red-50/20">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
            <AlertCircle size={16} /> Recent Critical Alerts
          </h3>
          <div className="space-y-2">
            {stats.recentCritical.map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/80 border border-red-100">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-800">{EVENT_LABELS[alert.eventType]?.label || alert.eventType}</p>
                  <p className="text-xs text-red-600 truncate">{alert.details}</p>
                </div>
                <span className="text-[10px] text-red-400 whitespace-nowrap">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Filter size={13} /> Filters:
        </div>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="input-field text-xs py-1.5 px-3 w-auto min-w-[130px]"
        >
          <option value="">All Severity</option>
          <option value="info">ℹ️ Info</option>
          <option value="warning">⚠️ Warning</option>
          <option value="critical">🔴 Critical</option>
        </select>
        <select
          value={eventTypeFilter}
          onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
          className="input-field text-xs py-1.5 px-3 w-auto min-w-[180px]"
        >
          <option value="">All Event Types</option>
          {Object.entries(EVENT_LABELS).map(([key, { label, icon }]) => (
            <option key={key} value={key}>{icon} {label}</option>
          ))}
        </select>
        {(severityFilter || eventTypeFilter) && (
          <button
            onClick={() => { setSeverityFilter(''); setEventTypeFilter(''); setPage(1); }}
            className="text-xs text-rose-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{total} total events</span>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead>
              <tr>
                <th className="th-base w-8"></th>
                <th className="th-base">Event</th>
                <th className="th-base">Severity</th>
                <th className="th-base">Details</th>
                <th className="th-base">Actor</th>
                <th className="th-base">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No compliance events found.</td></tr>
              ) : (
                logs.map((log) => {
                  const sev = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                  const evInfo = EVENT_LABELS[log.eventType] || { label: log.eventType, icon: '📋' };
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className={`hover:bg-slate-50 cursor-pointer transition ${selectedLog?.id === log.id ? 'bg-slate-50' : ''}`}
                    >
                      <td className="td-base text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${sev.dot}`} />
                      </td>
                      <td className="td-base">
                        <div className="flex items-center gap-2">
                          <span>{evInfo.icon}</span>
                          <span className="text-xs font-semibold text-slate-800">{evInfo.label}</span>
                        </div>
                      </td>
                      <td className="td-base">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sev.bg} ${sev.text}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="td-base">
                        <p className="text-xs text-slate-600 max-w-xs truncate">{log.details || '—'}</p>
                      </td>
                      <td className="td-base">
                        <span className="text-xs text-slate-500">{log.actorType || 'system'}</span>
                      </td>
                      <td className="td-base whitespace-nowrap">
                        <span className="text-xs text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Detail */}
        {selectedLog && (
          <div className="border-t p-4 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-slate-700 uppercase">Full Event Details</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Event ID</span>
                <span className="font-mono text-slate-700">{selectedLog.id?.slice(0, 12)}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">User ID</span>
                <span className="font-mono text-slate-700">{selectedLog.userId?.slice(0, 12) || '—'}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">Order ID</span>
                <span className="font-mono text-slate-700">{selectedLog.orderId?.slice(0, 12) || '—'}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">Prescription ID</span>
                <span className="font-mono text-slate-700">{selectedLog.prescriptionId?.slice(0, 12) || '—'}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">Medicine ID</span>
                <span className="font-mono text-slate-700">{selectedLog.medicineId?.slice(0, 12) || '—'}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">Pharmacy ID</span>
                <span className="font-mono text-slate-700">{selectedLog.pharmacyId?.slice(0, 12) || '—'}…</span>
              </div>
              <div>
                <span className="text-slate-400 block">Actor</span>
                <span className="font-mono text-slate-700">{selectedLog.actorId?.slice(0, 12) || '—'} ({selectedLog.actorType || 'system'})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Severity</span>
                <span className={`font-bold ${SEVERITY_COLORS[selectedLog.severity]?.text || ''}`}>{selectedLog.severity?.toUpperCase()}</span>
              </div>
            </div>
            {selectedLog.details && (
              <div className="mt-3 p-3 bg-white rounded-lg border text-xs text-slate-700 whitespace-pre-wrap font-mono">
                {selectedLog.details}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages} ({total} events)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
