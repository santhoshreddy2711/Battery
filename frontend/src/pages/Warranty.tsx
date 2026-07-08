import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle, 
  XCircle,
  FilePlus,
  Clock,
  User,
  Calendar,
  ZapOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WarrantyClaim {
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface Warranty {
  id: string;
  warrantyId: string;
  customerName: string;
  customerMobile: string;
  batteryModel: string;
  batteryBrand: string;
  purchaseDate: string;
  expiryDate: string;
  claimStatus: 'Active' | 'Claimed' | 'Expired';
  claims: WarrantyClaim[];
}

export const Warranty: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast, refreshAlerts } = useNotifications();

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected warranty for filing a claim
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimReason, setClaimReason] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const fetchWarranties = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/warranty', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load warranty registry.');
      const data = await res.json();
      setWarranties(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [token]);

  const handleFileClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWarranty || !claimReason) return;

    setSubmittingClaim(true);
    try {
      const res = await fetch(`/api/warranty/${selectedWarranty.warrantyId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: claimReason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error filing warranty claim.');

      addToast(`Claim request filed for ${selectedWarranty.warrantyId}.`, 'success');
      setClaimReason('');
      setShowClaimModal(false);
      fetchWarranties();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleResolveClaim = async (warrantyId: string, claimIndex: number, status: 'Approved' | 'Rejected') => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to set this claim status to ${status}?`)) return;

    try {
      const res = await fetch(`/api/warranty/${warrantyId}/claim/${claimIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error resolving claim.');

      addToast(`Claim request successfully ${status}!`, 'success');
      fetchWarranties();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Filters
  const filteredWarranties = warranties.filter(w => {
    const matchesSearch = w.warrantyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.customerMobile.includes(searchTerm) ||
      w.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.batteryModel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || w.claimStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate near exps warning banner (under 30 days remaining)
  const isExpiringSoon = (expiryDateStr: string) => {
    const today = new Date();
    const exp = new Date(expiryDateStr);
    const timeDiff = exp.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 0 && daysDiff <= 30;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Warranty & Claims Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Verify serial key registrations, file battery replacement cases, and inspect approval lists.</p>
        </div>
        <button
          onClick={fetchWarranties}
          className="flex items-center justify-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
        >
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="erp-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search certificate ID, customer name, mobile, battery SKU..."
            className="pl-10 erp-input py-2 text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="erp-input py-2 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Claimed">Claimed (Replaced)</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Main warranty certificate registry */}
      <div className="erp-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <RefreshCw className="text-red-600 animate-spin" size={24} />
            <span className="text-xs text-slate-400 font-medium">Checking claim ledgers...</span>
          </div>
        ) : filteredWarranties.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No warranty certificates found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredWarranties.map((w) => {
              const nearExp = w.claimStatus === 'Active' && isExpiringSoon(w.expiryDate);
              
              return (
                <div key={w.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors duration-150">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={
                        w.claimStatus === 'Active' ? 'text-emerald-500' : w.claimStatus === 'Claimed' ? 'text-blue-500' : 'text-slate-400'
                      } size={18} />
                      <span className="font-display font-extrabold text-xs tracking-wider text-slate-800 dark:text-white uppercase">
                        {w.warrantyId}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        w.claimStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : w.claimStatus === 'Claimed'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        {w.claimStatus === 'Claimed' ? 'Replaced (Claimed)' : w.claimStatus}
                      </span>

                      {nearExp && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 text-[9px] font-bold rounded animate-pulse border border-amber-200/40 flex items-center gap-1">
                          <ZapOff size={10} /> Expiring soon
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-6 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <p className="flex items-center gap-1.5"><User size={13} /> {w.customerName} ({w.customerMobile})</p>
                      <p className="flex items-center gap-1.5"><ShieldAlert size={13} /> Model: <span className="font-semibold text-slate-700 dark:text-slate-300">{w.batteryBrand} {w.batteryModel}</span></p>
                      <p className="flex items-center gap-1.5"><Calendar size={13} /> Expiry: <span className="font-semibold">{w.expiryDate}</span></p>
                    </div>

                    {/* Claims history details */}
                    {w.claims.length > 0 && (
                      <div className="mt-3 pl-5 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Claims Log History:</p>
                        {w.claims.map((claim, cIdx) => (
                          <div key={cIdx} className="text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                            <Clock size={12} className="text-slate-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">{claim.date}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  claim.status === 'Pending' 
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                    : claim.status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                                }`}>
                                  {claim.status}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{claim.reason}</p>
                              
                              {/* Resolve Buttons for Admins & Staff */}
                              {claim.status === 'Pending' && (
                                <div className="mt-2.5 flex gap-2">
                                  <button
                                    onClick={() => handleResolveClaim(w.warrantyId, cIdx, 'Approved')}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle size={10} /> Approve Replacement
                                  </button>
                                  <button
                                    onClick={() => handleResolveClaim(w.warrantyId, cIdx, 'Rejected')}
                                    className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle size={10} /> Reject Claim
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="shrink-0 flex items-center">
                    {w.claimStatus === 'Active' && !w.claims.some(c => c.status === 'Pending') && (
                      <button
                        onClick={() => {
                          setSelectedWarranty(w);
                          setShowClaimModal(true);
                        }}
                        className="flex items-center gap-1.5 btn-secondary py-1.5 px-3 text-xs font-semibold bg-white"
                      >
                        <FilePlus size={14} className="text-red-500" />
                        File Claims Request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File Claims Modal */}
      <AnimatePresence>
        {showClaimModal && selectedWarranty && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                <ShieldAlert className="text-red-600" size={18} />
                File Battery Replacement Claim
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                State failure diagnostics. This will initiate verification processes.
              </p>

              <form onSubmit={handleFileClaimSubmit} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs space-y-1">
                  <p className="text-slate-500">Cert ID: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedWarranty.warrantyId}</span></p>
                  <p className="text-slate-500">Battery Model: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedWarranty.batteryBrand} {selectedWarranty.batteryModel}</span></p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Diagnostic Failure Reason</label>
                  <textarea
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="e.g. Battery not holding charge, cells shorted, voltage drops below 9V under starter motor load test."
                    rows={4}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-sans focus:outline-none focus:border-red-500 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    {submittingClaim ? 'Submitting...' : 'Register Claim'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
