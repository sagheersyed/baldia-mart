'use client';

import { useState, useEffect } from 'react';
import { BASE_URL, fetchWithAuth } from '@/lib/api';
import { format } from 'date-fns';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCcw,
  Banknote,
  History,
  AlertCircle,
  CreditCard,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function WalletsPage() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'requests'>('wallets');
  const [wallets, setWallets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Settlement Modal State
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementDesc, setSettlementDesc] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Approval Modal State
  const [requestToApprove, setRequestToApprove] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Wallets
      const walletUrl = `${BASE_URL}/wallets/all${filterType ? `?userType=${filterType}` : ''}`;
      const walletRes = await fetchWithAuth(walletUrl);
      const walletData = await walletRes.json();
      if (walletRes.ok && Array.isArray(walletData)) {
        setWallets(walletData);
      }

      // Fetch Pending Requests
      const reqRes = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/pending`);
      const reqData = await reqRes.json();
      if (reqRes.ok && Array.isArray(reqData)) {
        setRequests(reqData);
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const handleManualSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !settlementAmount || !referenceId) return;

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/settle-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          amount: parseFloat(settlementAmount),
          description: settlementDesc || 'Manual settlement by Admin',
          referenceId: referenceId
        }),
      });

      if (res.ok) {
        setSelectedWallet(null);
        setSettlementAmount('');
        setSettlementDesc('');
        setReferenceId('');
        fetchData();
      } else {
        alert('Settlement failed');
      }
    } catch (error) {
      console.error('Settlement error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requestId: string, refId: string, notes: string) => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceId: refId, notes }),
      });

      if (res.ok) {
        setRequestToApprove(null);
        fetchData();
      } else {
        alert('Approval failed');
      }
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async (requestId: string, notes: string) => {
    if (!notes) return alert('Reason for rejection is required');
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/wallets/withdraw-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Rejection error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Stats Calculations
  const platformLiability = wallets.reduce((acc, w) => acc + (Number(w.balance) > 0 ? Number(w.balance) : 0), 0);
  const outstandingCredit = wallets.reduce((acc, w) => acc + (Number(w.balance) < 0 ? Math.abs(Number(w.balance)) : 0), 0);
  const pendingCashoutAmount = requests.reduce((acc, r) => acc + Number(r.amount), 0);

  const filteredWallets = wallets.filter(w => {
    const searchStr = searchTerm.toLowerCase();
    const riderName = w.rider?.name?.toLowerCase() || '';
    const userName = w.user?.name?.toLowerCase() || '';
    const userId = w.userId.toLowerCase();
    return riderName.includes(searchStr) || userName.includes(searchStr) || userId.includes(searchStr);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Banknote className="text-primary" size={28} />
            </div>
            Financial Control Center
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Manage settlements, payouts and platform health</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-primary hover:border-primary/20 hover:shadow-lg transition-all"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Glassmorphism Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <ArrowUpRight size={80} className="text-red-500" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Platform Liability</p>
          <div className="text-3xl font-black text-gray-900 leading-none mb-1">
            Rs {platformLiability.toLocaleString()}
          </div>
          <p className="text-[10px] font-bold text-red-500/80 flex items-center gap-1">
            <AlertCircle size={10} /> Total amount owed to users/vendors
          </p>
        </div>

        <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <ArrowDownLeft size={80} className="text-green-500" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Outstanding Credit</p>
          <div className="text-3xl font-black text-gray-900 leading-none mb-1">
            Rs {outstandingCredit.toLocaleString()}
          </div>
          <p className="text-[10px] font-bold text-green-600/80 flex items-center gap-1">
            <CheckCircle2 size={10} /> Cash currently held by riders (COD)
          </p>
        </div>

        <div className="bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <History size={80} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-2">Pending Cashouts</p>
          <div className="text-3xl font-black leading-none mb-1">
            {requests.length} Requests
          </div>
          <p className="text-[10px] font-bold text-white/80">
            Total Rs {pendingCashoutAmount.toLocaleString()} to be settled
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 rounded-[3rem] shadow-sm overflow-hidden">
        {/* Tabs & Search */}
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex p-1 bg-gray-50 rounded-2xl w-full md:w-fit">
            <button 
              onClick={() => setActiveTab('wallets')}
              className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'wallets' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              All Wallets
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Payout Requests
              {requests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">{requests.length}</span>}
            </button>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <input 
                  type="text" 
                  placeholder="Search by name, ID or phone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 pl-12 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
             </div>
             <select 
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
               className="bg-gray-50 border-none rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-wider text-gray-500 outline-none cursor-pointer hover:bg-gray-100 transition-all"
             >
               <option value="">All Types</option>
               <option value="Rider">Riders</option>
               <option value="Vendor">Vendors</option>
             </select>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {activeTab === 'wallets' ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient Details</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance Status</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Activity</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Financial Records...</td></tr>
                ) : filteredWallets.length === 0 ? (
                  <tr><td colSpan={4} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No active wallets found</td></tr>
                ) : filteredWallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black">
                          {wallet.rider?.name?.[0] || wallet.user?.name?.[0] || <User size={20} />}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">
                            {wallet.rider?.name || wallet.user?.name || 'System User'}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${wallet.userType === 'Rider' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                            {wallet.userType} • {wallet.userId.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`text-lg font-black ${Number(wallet.balance) < 0 ? 'text-red-500' : Number(wallet.balance) > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                        Rs {Number(wallet.balance).toLocaleString()}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1">
                        {Number(wallet.balance) < 0 ? 'Owes Platform' : Number(wallet.balance) > 0 ? 'Available Payout' : 'Zero Balance'}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-sm font-bold text-gray-500">
                      {format(new Date(wallet.updatedAt), 'MMM dd, yyyy')}
                      <div className="text-[10px] font-medium text-gray-300 mt-0.5">{format(new Date(wallet.updatedAt), 'HH:mm')}</div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => setSelectedWallet(wallet)}
                        className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rider/Vendor</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Requested</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Details</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.length === 0 ? (
                  <tr><td colSpan={4} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No pending payout requests</td></tr>
                ) : requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                       <div className="text-sm font-black text-gray-900 tracking-tight">Wallet #{req.walletId.slice(0,8)}</div>
                       <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">{format(new Date(req.createdAt), 'MMM dd, HH:mm')}</div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="text-xl font-black text-primary">Rs {Number(req.amount).toLocaleString()}</div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="text-[11px] font-bold text-gray-800 flex items-center gap-2">
                         <CreditCard size={14} className="text-gray-400" />
                         {req.bankName || 'N/A'}
                       </div>
                       <div className="text-[11px] font-black text-gray-400 mt-1">{req.accountNumber || 'Unknown Account'}</div>
                       <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{req.accountName}</div>
                    </td>
                    <td className="px-10 py-6 text-right space-x-2">
                       <button 
                         onClick={() => setRequestToApprove(req)}
                         className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20 transition-all"
                       >
                         Approve
                       </button>
                       <button 
                         onClick={() => handleRejectRequest(req.id, 'Insufficient documentation/Policy violation')}
                         className="px-5 py-2.5 bg-white border border-gray-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-100 hover:bg-red-50 transition-all"
                       >
                         Reject
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual Settlement Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-10 border-b border-gray-50 flex justify-between items-start">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manual Settlement</h2>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Wallet for {selectedWallet.rider?.name || selectedWallet.user?.name || selectedWallet.userId.slice(0,8)}</p>
                </div>
                <button onClick={() => setSelectedWallet(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle size={24} className="text-gray-300" /></button>
             </div>
             
             <div className="p-10">
                <div className="bg-gray-50 p-6 rounded-[2rem] mb-8 flex justify-between items-center">
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Balance</p>
                     <div className={`text-2xl font-black ${Number(selectedWallet.balance) < 0 ? 'text-red-500' : 'text-green-500'}`}>Rs {Number(selectedWallet.balance).toLocaleString()}</div>
                   </div>
                   <div className="p-4 bg-white rounded-2xl shadow-sm text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                     {Number(selectedWallet.balance) < 0 ? 'DEBT' : 'CREDIT'}
                   </div>
                </div>

                <form onSubmit={handleManualSettle} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Amount</label>
                        <input 
                          type="number" 
                          required 
                          value={settlementAmount}
                          onChange={(e) => setSettlementAmount(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Ref ID</label>
                        <input 
                          type="text" 
                          required
                          value={referenceId}
                          onChange={(e) => setReferenceId(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          placeholder="TXN-XXXXXX"
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Notes / Description</label>
                      <textarea 
                        rows={3}
                        value={settlementDesc}
                        onChange={(e) => setSettlementDesc(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-3xl py-4 px-6 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Explain the reason for this manual settlement..."
                      />
                   </div>

                   <button 
                     disabled={submitting}
                     className="w-full bg-primary text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                   >
                     {submitting ? 'Updating Balances...' : 'Execute Settlement'}
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Withdrawal Approval Modal */}
      {requestToApprove && (
         <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
               <div className="p-10 border-b border-gray-50">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Approve Payout</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ensure the bank transfer is complete before confirming.</p>
               </div>
               <div className="p-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-4 bg-green-50 rounded-2xl text-green-600">
                        <Banknote size={32} />
                     </div>
                     <div>
                        <div className="text-3xl font-black text-gray-900">Rs {Number(requestToApprove.amount).toLocaleString()}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payable to: {requestToApprove.accountName}</div>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Payment Reference (Required)</label>
                      <input 
                        type="text" 
                        id="approvalRef"
                        required
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Bank Transaction ID"
                      />
                    </div>
                    
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setRequestToApprove(null)}
                         className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest"
                       >
                         Back
                       </button>
                       <button 
                         onClick={() => {
                           const ref = (document.getElementById('approvalRef') as HTMLInputElement).value;
                           if(!ref) return alert('Reference ID is required');
                           handleApproveRequest(requestToApprove.id, ref, 'Processed via Bank Transfer');
                         }}
                         className="flex-[2] bg-green-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20"
                       >
                         Confirm & Notify User
                       </button>
                    </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
