'use client';

import React, { useState, useEffect } from 'react';
import { BASE_URL, fetchWithAuth, getErrorMessage, parseApiError } from '@/lib/api';
import { format } from 'date-fns';
import { showToast } from '@/hooks/useToast';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle,
  Clock, Search, RefreshCw, Banknote, History, AlertCircle, CreditCard, X, ArrowUpCircle,
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
  const [walletsData,        setWalletsData]        = useState<any[]>([]);
  const [requestsData,       setRequestsData]       = useState<any[]>([]);
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
  const [reconType,          setReconType]          = useState<'balance' | 'cash'>('balance');
  const [withdrawTarget,     setWithdrawTarget]     = useState<any>(null);
  const [withdrawAmount,     setWithdrawAmount]     = useState('');
  const [withdrawBank,       setWithdrawBank]       = useState('');
  const [withdrawAccNo,      setWithdrawAccNo]      = useState('');
  const [withdrawAccName,    setWithdrawAccName]    = useState('');

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const walletUrl = `${BASE_URL}/wallets/all${filterType ? `?userType=${filterType}` : ''}`;
      const [wRes, rRes] = await Promise.all([
        fetchWithAuth(walletUrl), 
        fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/pending`)
      ]);
      if (!wRes.ok) throw new Error(await parseApiError(wRes, 'Failed to load wallets'));
      if (!rRes.ok) throw new Error(await parseApiError(rRes, 'Failed to load requests'));
      const [wData, rData] = await Promise.all([wRes.json(), rRes.json()]);
      setWalletsData(Array.isArray(wData) ? wData : []);
      setRequestsData(Array.isArray(rData) ? rData : []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Platform sync failed');
      setError(msg);
      showToast({ title: msg, variant: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterType]);

  const handleManualSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !settlementAmount || !referenceId) return;
    setSubmitting(true);
    try {
      let res;
      if (reconType === 'cash') {
        res = await fetchWithAuth(`${BASE_URL}/finance/admin/reconcile-cash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            riderId: selectedWallet.userId, 
            amount: parseFloat(settlementAmount), 
            referenceId 
          }),
        });
      } else {
        res = await fetchWithAuth(`${BASE_URL}/wallets/settle-manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletId: selectedWallet.id, 
            amount: parseFloat(settlementAmount), 
            description: settlementDesc || 'Platform reconciliation', 
            referenceId 
          }),
        });
      }
      if (res.ok) {
        setSelectedWallet(null); setSettlementAmount(''); setSettlementDesc(''); setReferenceId(''); setReconType('balance');
        showToast({ title: 'Capital reconciled successfully', variant: 'success' }); loadData();
      } else {
        showToast({ title: await parseApiError(res, 'Reconciliation failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Operation failure'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleApproveRequest = async (requestId: string, refId: string) => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceId: refId, notes: 'System payout approved' }),
      });
      if (res.ok) {
        setRequestToApprove(null); showToast({ title: 'Liquidity released', variant: 'success' }); loadData();
      } else {
        showToast({ title: await parseApiError(res, 'Release failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Liquidity block error'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleRejectRequest = async (requestId: string) => {
    const notes = window.prompt('Reason for denial (Audit Log required):');
    if (!notes) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        showToast({ title: 'Request denied & logged', variant: 'success' }); loadData();
      } else {
        showToast({ title: await parseApiError(res, 'Denial failed'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Audit failure'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawTarget || !withdrawAmount) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/admin/withdraw-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: withdrawTarget.userId,
          userType: withdrawTarget.userType,
          amount: parseFloat(withdrawAmount),
          bankName: withdrawBank,
          accountNumber: withdrawAccNo,
          accountName: withdrawAccName,
        }),
      });
      if (res.ok) {
        setWithdrawTarget(null); setWithdrawAmount(''); setWithdrawBank(''); setWithdrawAccNo(''); setWithdrawAccName('');
        showToast({ title: 'Withdrawal request created — pending approval', variant: 'success' }); loadData();
      } else {
        showToast({ title: await parseApiError(res, 'Failed to create request'), variant: 'error' });
      }
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Request failed'), variant: 'error' });
    } finally { setSubmitting(false); }
  };

  const platformLiability     = walletsData.reduce((a, w) => a + (Number(w.balance) > 0 ? Number(w.balance) : 0), 0);
  const outstandingCredit     = walletsData.reduce((a, w) => a + (Number(w.balance) < 0 ? Math.abs(Number(w.balance)) : 0), 0);
  const pendingCashoutAmount  = requestsData.reduce((a, r) => a + Number(r.amount), 0);

  const filteredWallets = walletsData.filter(w => {
    const s = searchTerm.toLowerCase();
    const name = (w.rider?.name || w.vendor?.name || w.restaurant?.name || w.pharmacy?.name || w.user?.name || '').toLowerCase();
    return name.includes(s) || (w.userId || '').toLowerCase().includes(s);
  });

  if (loading && walletsData.length === 0) return <div className="p-20 flex flex-col items-center justify-center animate-pulse"><RefreshCw className="animate-spin text-primary-500 mb-4" size={40} /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Syncing Ledger...</p></div>;

  return (
    <div className="page-container space-y-12 pb-24">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
               <Wallet size={24} className="text-emerald-400" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Capital HQ</h1>
          </div>
          <p className="text-slate-400 font-bold ml-15 text-[10px] uppercase tracking-[0.3em] pl-15">Liquidity Rebuff · Transaction Control</p>
        </div>
        <button
          onClick={loadData}
          className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all active:scale-90"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI HUB */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Platform Liability', value: platformLiability, icon: ArrowUpRight, color: 'rose', desc: 'Owed to entities' },
          { label: 'Outstanding Credit', value: outstandingCredit, icon: ArrowDownLeft, color: 'emerald', desc: 'Held by riders (COD)' },
          { label: 'Pending Payouts', value: pendingCashoutAmount, icon: Banknote, color: 'blue', desc: `${requestsData.length} active requests` },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 group hover:-translate-y-2 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={20} />
              </div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest underline underline-offset-4 decoration-2">Audit KPI</div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">RS. {stat.value.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter italic opacity-60">· {stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Operation Area */}
      <div className="card !p-0 !rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/30">
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-6">
           <div className="flex bg-white/50 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-100">
             {(['wallets', 'requests'] as const).map(t => (
               <button
                 key={t}
                 onClick={() => setActiveTab(t)}
                 className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
               >
                 {t === 'wallets' ? 'Capital Accounts' : 'Payout Queue'}
                 {t === 'requests' && requestsData.length > 0 && <span className="ml-2 bg-rose-500 text-white px-1.5 py-0.5 rounded-md text-[9px]">{requestsData.length}</span>}
               </button>
             ))}
           </div>

           <div className="flex items-center gap-4 flex-1 max-w-xl">
             <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={16} />
               <input
                 type="text"
                 placeholder="Search ledger entities..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 outline-none transition-all placeholder:text-slate-200"
               />
             </div>
             <select
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
               className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary-500/10 transition-all text-slate-600"
             >
               <option value="">Status: ALL</option>
               <option value="Rider">Riders</option>
               <option value="Vendor">Vendors</option>
             </select>
           </div>
        </div>

        <div className="p-0 overflow-x-auto">
          {activeTab === 'wallets' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100">
                  <th className="px-10 py-6">ENTITY PROFILE</th>
                  <th className="px-10 py-6">ACCOUNT TYPE</th>
                  <th className="px-10 py-6">NET BALANCE</th>
                  <th className="px-10 py-6">CASH IN HAND</th>
                  <th className="px-10 py-6">STATUS</th>
                  <th className="px-10 py-6">SYNC DATE</th>
                  <th className="px-10 py-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredWallets.map(w => {
                  const entityName = w.rider?.name || w.vendor?.name || w.restaurant?.name || w.pharmacy?.name || w.user?.name || 'Unknown Entity';
                  const moduleLabel = w.userType === 'Rider' ? 'Rider' : w.restaurant?.id ? 'Restaurant' : w.pharmacy?.id ? 'Pharmacy' : w.vendor?.id ? 'Mart Vendor' : w.userType;
                  const badgeStyle = w.userType === 'Rider' ? 'bg-blue-50 text-blue-600 border-blue-100' : w.restaurant?.id ? 'bg-rose-50 text-rose-600 border-rose-100' : w.pharmacy?.id ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-purple-50 text-purple-600 border-purple-100';
                  return (
                   <tr key={w.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="px-10 py-6">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm italic shadow-lg shadow-slate-900/10">
                           {(entityName[0] || 'X').toUpperCase()}
                         </div>
                         <div>
                           <p className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">{entityName}</p>
                           <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">UID: {w.userId?.slice(-8).toUpperCase()}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-10 py-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase border ${badgeStyle}`}>
                         {moduleLabel}
                       </span>
                     </td>
                    <td className="px-10 py-6">
                      <p className={`text-xl font-black italic tracking-tighter ${Number(w.balance) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        RS. {Number(w.balance).toLocaleString()}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{Number(w.balance) < 0 ? 'PLATFORM CREDIT' : 'CLEARANCE READY'}</p>
                    </td>
                    <td className="px-10 py-6">
                      {w.userType === 'Rider' ? (
                        <>
                          <p className={`text-lg font-black italic tracking-tighter ${Number(w.cashInHand) > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                            RS. {Number(w.cashInHand || 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">COD LIABILITY</p>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">N/A</span>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      {w.isSuspended ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase bg-rose-50 text-rose-600 border border-rose-100">
                          <AlertCircle size={12} /> SUSPENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 size={12} /> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                       {safeFormat(w.updatedAt, 'MMM dd, yyyy')}
                    </td>
                     <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setSelectedWallet(w)} title="Manual Settlement" className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:shadow-xl transition-all active:scale-90"><Banknote size={18} /></button>
                          {w.userType === 'Vendor' && Number(w.balance) > 0 && (<button onClick={() => { setWithdrawTarget(w); setWithdrawAmount(''); setWithdrawBank(''); setWithdrawAccNo(''); setWithdrawAccName(''); }} title="Create Withdrawal Request" className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:shadow-xl transition-all active:scale-90"><ArrowUpCircle size={18} /></button>)}
                        </div>
                     </td>
                   </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100">
                  <th className="px-10 py-6">DISBURSEMENT ID</th>
                  <th className="px-10 py-6">QUANTUM</th>
                  <th className="px-10 py-6">RECIPIENT CHANNEL</th>
                  <th className="px-10 py-6">TIMESTAMP</th>
                  <th className="px-10 py-6 text-right">PROTOCOL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requestsData.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">Queue Clean · All Liquidated</td></tr>
                ) : requestsData.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-6">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">#{req.id?.slice(-12).toUpperCase()}</p>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">RS. {Number(req.amount).toLocaleString()}</p>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg"><CreditCard size={14} /></div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter leading-none">{req.bankName}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5">{req.accountNumber}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase">
                      {safeFormat(req.createdAt, 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex justify-end gap-3">
                          <button
                            onClick={() => { setApprovalReferenceId(''); setRequestToApprove(req); }}
                            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-6 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                          >
                            Deny
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual Settlement Glass Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/40 animate-in fade-in duration-300">
           <div className="bg-white/95 w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-500">
              <div className="p-12 space-y-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                          <Banknote size={24} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Settlement Protocol</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Entity reconciliation · Global Ledger</p>
                       </div>
                    </div>
                    <button onClick={() => { setSelectedWallet(null); setReconType('balance'); }} className="p-4 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full transition-all active:rotate-90">
                       <X size={24} />
                    </button>
                 </div>

                 <div className="bg-slate-950 p-10 rounded-[3rem] text-white flex justify-between items-center shadow-2xl shadow-slate-900/20">
                    <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">Target Profile</p>
                       <p className="text-xl font-black italic uppercase tracking-tight">{selectedWallet.rider?.name || selectedWallet.vendor?.name || selectedWallet.user?.name || 'Merchant'}</p>
                    </div>
                    <div className="text-right">
                       {selectedWallet.userType === 'Rider' ? (
                         <div className="flex gap-6 justify-end">
                           <div>
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 text-right">Net Balance</p>
                              <p className={`text-xl font-black tracking-tighter ${Number(selectedWallet.balance) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>RS. {Number(selectedWallet.balance).toLocaleString()}</p>
                           </div>
                           <div className="border-l border-white/10 pl-6">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 text-right">Held COD Cash</p>
                              <p className="text-xl font-black tracking-tighter text-amber-500 font-mono">RS. {Number(selectedWallet.cashInHand || 0).toLocaleString()}</p>
                           </div>
                         </div>
                       ) : (
                         <>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">Live Balance</p>
                            <p className={`text-2xl font-black tracking-tighter ${Number(selectedWallet.balance) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>RS. {Number(selectedWallet.balance).toLocaleString()}</p>
                         </>
                       )}
                    </div>
                 </div>

                 {selectedWallet.userType === 'Rider' && (
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reconciliation Action</label>
                     <div className="grid grid-cols-2 gap-4 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setReconType('balance')}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reconType === 'balance' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                          Adjust Net Balance
                        </button>
                        <button
                          type="button"
                          onClick={() => setReconType('cash')}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reconType === 'cash' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                          Clear Held Cash (COD)
                        </button>
                     </div>
                   </div>
                 )}

                 <form onSubmit={handleManualSettle} className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantum (RS.)</label>
                          <input type="number" required value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-black italic focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-inner" placeholder="0.00" />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transmission ID</label>
                          <input type="text" required value={referenceId} onChange={e => setReferenceId(e.target.value)} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-black focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-inner" placeholder="RECON-XX-XX" />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol Notes</label>
                       <textarea rows={3} value={settlementDesc} onChange={e => setSettlementDesc(e.target.value)} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-black focus:ring-4 focus:ring-primary-500/10 outline-none transition-all resize-none shadow-inner" placeholder="Explain the reconciliation rationale..." />
                    </div>
                    <button type="submit" disabled={submitting} className="w-full h-20 bg-slate-900 text-white rounded-[2.5rem] font-black tracking-[0.4em] uppercase text-[11px] hover:bg-black transition-all shadow-2xl shadow-slate-900/40 active:scale-95 disabled:opacity-50">
                       {submitting ? <RefreshCw className="animate-spin mx-auto" size={24} /> : 'Sync Capital Ledger'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Payout Release Modal */}
      {requestToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/40 animate-in fade-in duration-300">
           <div className="bg-white/95 w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-500">
              <div className="p-12 space-y-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20">
                          <CheckCircle2 size={24} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic text-emerald-600">Disbursement Release</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Verify bank transaction before release</p>
                       </div>
                    </div>
                    <button onClick={() => setRequestToApprove(null)} className="p-4 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full transition-all">
                       <X size={24} />
                    </button>
                 </div>

                 <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.3em] mb-3">Release Quantum</p>
                          <p className="text-4xl font-black italic tracking-tighter text-emerald-700">RS. {Number(requestToApprove.amount).toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.3em] mb-3">Channel</p>
                          <p className="text-sm font-black text-emerald-900 uppercase">{requestToApprove.bankName}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Transmission Reference (REQUIRED)</label>
                    <input type="text" value={approvalReferenceId} onChange={e => setApprovalReferenceId(e.target.value)} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-black focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" placeholder="TXN-BANK-PAY-XXXXXX" />
                 </div>

                 <div className="flex gap-6">
                    <button onClick={() => setRequestToApprove(null)} className="px-8 py-6 bg-slate-50 text-slate-400 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                    <button
                      disabled={submitting || !approvalReferenceId}
                      onClick={() => handleApproveRequest(requestToApprove.id, approvalReferenceId)}
                      className="flex-1 h-20 bg-emerald-500 text-white rounded-[2.5rem] font-black tracking-[0.4em] uppercase text-[11px] hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/40 active:scale-95 disabled:opacity-20"
                    >
                      {submitting ? <RefreshCw className="animate-spin mx-auto" size={24} /> : 'Execute Disbursement'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Withdrawal Request Modal for Vendor Wallets */}
      {withdrawTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/40 animate-in fade-in duration-300">
           <div className="bg-white/95 w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden border border-white/50 animate-in zoom-in-95 duration-500">
              <div className="p-12 space-y-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/20">
                          <ArrowUpCircle size={24} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Create Withdrawal</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Submit payout request to queue</p>
                       </div>
                    </div>
                    <button onClick={() => setWithdrawTarget(null)} className="p-4 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full transition-all active:rotate-90">
                       <X size={24} />
                    </button>
                 </div>

                 <div className="bg-slate-950 p-8 rounded-[3rem] text-white flex justify-between items-center">
                    <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Entity</p>
                       <p className="text-lg font-black italic uppercase tracking-tight">{withdrawTarget.rider?.name || withdrawTarget.vendor?.name || withdrawTarget.restaurant?.name || withdrawTarget.pharmacy?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Available</p>
                       <p className="text-2xl font-black tracking-tighter text-emerald-400">RS. {Number(withdrawTarget.balance).toLocaleString()}</p>
                    </div>
                 </div>

                 <form onSubmit={handleWithdrawRequest} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (RS.)</label>
                          <input type="number" required max={withdrawTarget.balance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black italic focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="0.00" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                          <input type="text" value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="HBL / Meezan / JazzCash" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                          <input type="text" value={withdrawAccNo} onChange={e => setWithdrawAccNo(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="XXXX-XXXXXXX-XXXX" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                          <input type="text" value={withdrawAccName} onChange={e => setWithdrawAccName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Full legal name" />
                       </div>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full h-18 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black tracking-[0.4em] uppercase text-[11px] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 active:scale-95 disabled:opacity-50">
                       {submitting ? <RefreshCw className="animate-spin mx-auto" size={24} /> : 'Queue Withdrawal Request'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
