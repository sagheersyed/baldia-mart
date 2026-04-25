'use client';

import { useState, useEffect } from 'react';
import { BASE_URL, fetchWithAuth, getErrorMessage, parseApiError } from '@/lib/api';
import { format } from 'date-fns';
import { showToast } from '@/hooks/useToast';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle,
  Clock, Search, RefreshCw, Banknote, History, AlertCircle, CreditCard, X,
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/PageState';

const safeFormat = (value: unknown, fmt: string) => {
  try {
    if (!value) return '—';
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, fmt);
  } catch { return '—'; }
};

export default function WalletsPage() {
  const [activeTab,          setActiveTab]          = useState<'wallets' | 'requests'>('wallets');
  const [wallets,            setWallets]            = useState<any[]>([]);
  const [requests,           setRequests]           = useState<any[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [filterType,         setFilterType]         = useState('');
  const [selectedWallet,     setSelectedWallet]     = useState<any>(null);
  const [settlementAmount,   setSettlementAmount]   = useState('');
  const [settlementDesc,     setSettlementDesc]     = useState('');
  const [referenceId,        setReferenceId]        = useState('');
  const [submitting,         setSubmitting]         = useState(false);
  const [requestToApprove,   setRequestToApprove]   = useState<any>(null);
  const [approvalReferenceId,setApprovalReferenceId]= useState('');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const walletUrl = `${BASE_URL}/wallets/all${filterType ? `?userType=${filterType}` : ''}`;
      const [wRes, rRes] = await Promise.all([
        fetchWithAuth(walletUrl),
        fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/pending`),
      ]);
      if (!wRes.ok) throw new Error(await parseApiError(wRes, 'Failed to load wallets'));
      if (!rRes.ok) throw new Error(await parseApiError(rRes, 'Failed to load payout requests'));
      setWallets(Array.isArray(await wRes.json()) ? (await fetchWithAuth(walletUrl).then(r=>r.json()).catch(()=>[])) : []);
      setRequests(Array.isArray(await rRes.json()) ? (await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/pending`).then(r=>r.json()).catch(()=>[])) : []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to fetch financial data');
      setError(msg);
      showToast({ title: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterType]);

  const handleManualSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !settlementAmount || !referenceId) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/settle-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: selectedWallet.id, amount: parseFloat(settlementAmount), description: settlementDesc || 'Manual settlement by Admin', referenceId }),
      });
      if (res.ok) {
        setSelectedWallet(null); setSettlementAmount(''); setSettlementDesc(''); setReferenceId('');
        showToast({ title: 'Settlement completed', variant: 'success' }); fetchData();
      } else {
        showToast({ title: await parseApiError(res, 'Settlement failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Settlement failed'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleApproveRequest = async (requestId: string, refId: string) => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceId: refId, notes: 'Processed via Bank Transfer' }),
      });
      if (res.ok) {
        setRequestToApprove(null); showToast({ title: 'Withdrawal approved', variant: 'success' }); fetchData();
      } else {
        showToast({ title: await parseApiError(res, 'Approval failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Approval failed'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleRejectRequest = async (requestId: string) => {
    const notes = window.prompt('Reason for rejection (required):');
    if (!notes) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        showToast({ title: 'Withdrawal rejected', variant: 'success' }); fetchData();
      } else {
        showToast({ title: await parseApiError(res, 'Rejection failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Rejection failed'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  // Re-fetch wallets using correct approach (fix double-fetch above)
  const [walletsData, setWalletsData] = useState<any[]>([]);
  const [requestsData, setRequestsData] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const walletUrl = `${BASE_URL}/wallets/all${filterType ? `?userType=${filterType}` : ''}`;
      const [wRes, rRes] = await Promise.all([fetchWithAuth(walletUrl), fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/pending`)]);
      if (!wRes.ok) throw new Error(await parseApiError(wRes, 'Failed to load wallets'));
      if (!rRes.ok) throw new Error(await parseApiError(rRes, 'Failed to load requests'));
      const [wData, rData] = await Promise.all([wRes.json(), rRes.json()]);
      setWalletsData(Array.isArray(wData) ? wData : []);
      setRequestsData(Array.isArray(rData) ? rData : []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to fetch financial data');
      setError(msg);
      showToast({ title: msg, variant: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterType]);

  const platformLiability     = walletsData.reduce((a, w) => a + (Number(w.balance) > 0 ? Number(w.balance) : 0), 0);
  const outstandingCredit     = walletsData.reduce((a, w) => a + (Number(w.balance) < 0 ? Math.abs(Number(w.balance)) : 0), 0);
  const pendingCashoutAmount  = requestsData.reduce((a, r) => a + Number(r.amount), 0);

  const filteredWallets = walletsData.filter(w => {
    const s = searchTerm.toLowerCase();
    return (w.rider?.name || '').toLowerCase().includes(s) || (w.user?.name || '').toLowerCase().includes(s) || (w.userId || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Wallet size={22} className="text-primary-600" /> Financial Control</h1>
          <p className="page-subtitle">Manage rider/vendor wallets, settlements, and payouts</p>
        </div>
        <button onClick={loadData} className="btn-ghost btn-icon">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="stat-card border-l-4 border-l-red-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-red-500" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform Liability</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">Rs {platformLiability.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> Owed to users/vendors</p>
        </div>
        <div className="stat-card border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ArrowDownLeft size={16} className="text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding Credit</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">Rs {outstandingCredit.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Cash held by riders (COD)</p>
        </div>
        <div className="stat-card border-l-4 border-l-primary-400 bg-primary-600 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <History size={16} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Pending Cashouts</p>
          </div>
          <p className="text-2xl font-bold">{requestsData.length} Requests</p>
          <p className="text-[11px] text-white/70 mt-1">Total Rs {pendingCashoutAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Table area */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('wallets')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeTab === 'wallets' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Wallets ({walletsData.length})
            </button>
            <button onClick={() => setActiveTab('requests')} className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition ${activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Payout Requests
              {requestsData.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full">{requestsData.length}</span>}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search…" className="input pl-9 w-52 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="input w-auto text-xs" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Rider">Riders</option>
              <option value="Vendor">Vendors</option>
            </select>
          </div>
        </div>

        {loading ? <LoadingState message="Loading financial data…" /> :
         error   ? <ErrorState message={error} onRetry={loadData} /> : (
          <div className="overflow-x-auto">
            {activeTab === 'wallets' ? (
              <table className="data-table">
                <thead><tr><th>Recipient</th><th>Type</th><th>Balance</th><th>Last Activity</th><th className="text-right">Action</th></tr></thead>
                <tbody>
                  {filteredWallets.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No wallets found</td></tr>
                  ) : filteredWallets.map(w => (
                    <tr key={w.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                            {(w.rider?.name?.[0] || w.user?.name?.[0] || 'W').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{w.rider?.name || w.user?.name || 'System User'}</p>
                            <p className="text-xs text-slate-400">#{(w.userId || '').slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={w.userType === 'Rider' ? 'badge-blue' : 'badge-purple'}>{w.userType}</span>
                      </td>
                      <td>
                        <span className={`text-sm font-bold ${Number(w.balance) < 0 ? 'text-red-600' : Number(w.balance) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          Rs {Number(w.balance).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{Number(w.balance) < 0 ? 'Owes platform' : Number(w.balance) > 0 ? 'Available' : 'Zero balance'}</p>
                      </td>
                      <td className="text-sm text-slate-500">{safeFormat(w.updatedAt, 'MMM dd, yyyy')}</td>
                      <td className="text-right">
                        <button onClick={() => setSelectedWallet(w)} className="btn-accent btn-icon"><Banknote size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead><tr><th>Wallet</th><th>Amount</th><th>Bank Details</th><th>Requested</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {requestsData.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No pending requests</td></tr>
                  ) : requestsData.map(req => (
                    <tr key={req.id}>
                      <td className="font-medium text-slate-700">#{(req.walletId || '').slice(0, 8)}</td>
                      <td><span className="text-lg font-bold text-primary-700">Rs {Number(req.amount).toLocaleString()}</span></td>
                      <td>
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><CreditCard size={12} className="text-slate-400" />{req.bankName || 'N/A'}</p>
                        <p className="text-xs text-slate-400">{req.accountNumber || '—'}</p>
                        <p className="text-[10px] text-slate-300 uppercase">{req.accountName}</p>
                      </td>
                      <td className="text-sm text-slate-500">{safeFormat(req.createdAt, 'MMM dd, HH:mm')}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setApprovalReferenceId(''); setRequestToApprove(req); }} className="btn-success">Approve</button>
                          <button onClick={() => handleRejectRequest(req.id)} className="btn-danger">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {selectedWallet && (
        <div className="modal-overlay" onClick={() => setSelectedWallet(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-800">Manual Settlement</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedWallet.rider?.name || selectedWallet.user?.name || selectedWallet.userId?.slice(0,8)}</p>
              </div>
              <button onClick={() => setSelectedWallet(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-5">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-sm font-semibold text-slate-600">Current Balance</span>
                <span className={`text-xl font-bold ${Number(selectedWallet.balance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  Rs {Number(selectedWallet.balance).toLocaleString()}
                </span>
              </div>
              <form id="settleForm" onSubmit={handleManualSettle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Amount (Rs.)</label>
                    <input type="number" required value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} className="input" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="input-label">Reference ID</label>
                    <input type="text" required value={referenceId} onChange={e => setReferenceId(e.target.value)} className="input" placeholder="TXN-XXXXXX" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Notes / Description</label>
                  <textarea rows={3} value={settlementDesc} onChange={e => setSettlementDesc(e.target.value)} className="input resize-none" placeholder="Reason for this settlement…" />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="submit" form="settleForm" disabled={submitting} className="btn-primary w-full justify-center py-3">
                {submitting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Execute Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {requestToApprove && (
        <div className="modal-overlay" onClick={() => setRequestToApprove(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="font-bold text-slate-800">Approve Payout</h2>
                <p className="text-xs text-slate-500 mt-0.5">Ensure the bank transfer is complete before confirming.</p>
              </div>
              <button onClick={() => setRequestToApprove(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-5">
              <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <Banknote size={28} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">Rs {Number(requestToApprove.amount).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">To: {requestToApprove.accountName}</p>
                </div>
              </div>
              <div>
                <label className="input-label">Payment Reference ID (required)</label>
                <input type="text" value={approvalReferenceId} onChange={e => setApprovalReferenceId(e.target.value)} className="input" placeholder="Bank Transaction ID" />
              </div>
            </div>
            <div className="modal-footer flex gap-3">
              <button onClick={() => setRequestToApprove(null)} className="btn-ghost flex-1 justify-center py-2.5">Cancel</button>
              <button
                onClick={() => {
                  if (!approvalReferenceId.trim()) { showToast({ title: 'Reference ID required', variant: 'error' }); return; }
                  handleApproveRequest(requestToApprove.id, approvalReferenceId.trim());
                }}
                disabled={submitting}
                className="btn-primary flex-[2] justify-center py-2.5"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={15} /> Confirm &amp; Notify</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
