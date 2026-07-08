import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Truck, 
  Search, 
  RefreshCw, 
  Plus, 
  DollarSign, 
  FileText, 
  PlusCircle, 
  ChevronRight,
  Phone,
  MapPin,
  Clock,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'Purchase' | 'Payment';
  amount: number;
  description: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  address: string;
  productsSupplied: string[];
  pendingPayments: number;
  ledger: LedgerEntry[];
}

export const Suppliers: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Supplier for Detail Panel
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Form states
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    address: '',
    productsSupplied: ''
  });

  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchSuppliers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load supplier records.');
      const data = await res.json();
      setSuppliers(data);
      
      // Auto select first supplier
      if (data.length > 0 && !selectedSupplier) {
        setSelectedSupplier(data[0]);
      } else if (selectedSupplier) {
        // Keep selected supplier state updated with fresh data
        const updated = data.find((s: Supplier) => s.id === selectedSupplier.id);
        if (updated) setSelectedSupplier(updated);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const formattedProducts = newSupplierForm.productsSupplied
        ? newSupplierForm.productsSupplied.split(',').map(s => s.trim())
        : [];

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newSupplierForm,
          productsSupplied: formattedProducts
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error adding supplier profile.');

      addToast(`${newSupplierForm.name} added to supplier records.`, 'success');
      setNewSupplierForm({ name: '', contactPerson: '', mobile: '', address: '', productsSupplied: '' });
      setShowAddModal(false);
      fetchSuppliers();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleMakePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSupplier || !payAmount) return;

    setPaying(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(payAmount),
          description: payDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error processing supplier payment.');

      addToast(`Payment of Rs. ${payAmount} logged for ${selectedSupplier.name}.`, 'success');
      setPayAmount('');
      setPayDesc('');
      setShowPayModal(false);
      
      // Update local detailed state
      setSelectedSupplier(data);
      fetchSuppliers();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setPaying(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Supplier Ledgers & Payments</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Track accounts payable outstanding bills, catalog supplier items, and view ledger balances.</p>
        </div>
        <button
          onClick={openAddModal => setShowAddModal(true)}
          className="flex items-center gap-2 btn-primary py-2 text-xs font-semibold"
        >
          <Plus size={16} /> Catalog New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Supplier List */}
        <div className="lg:col-span-1 erp-card flex flex-col h-[calc(100vh-14rem)] bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search supplier name..."
                className="pl-10 erp-input py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="text-red-600 animate-spin mx-auto mb-2" size={20} />
                <span className="text-xs text-slate-400">Loading directory...</span>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No suppliers registered.
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const isSelected = selectedSupplier?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSupplier(s)}
                    className={`w-full p-4 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                      isSelected 
                        ? 'bg-red-50/15 dark:bg-red-950/10 border-l-4 border-red-600' 
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{s.name}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Phone size={10} /> {s.mobile}
                      </p>
                    </div>
                    
                    {s.pendingPayments > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 shrink-0 border border-red-200/40">
                        ₹{s.pendingPayments.toLocaleString()} due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 shrink-0 border border-emerald-200/40">
                        Cleared
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Supplier profile & ledger entry logs */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSupplier ? (
            <motion.div
              key={selectedSupplier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Card Summary */}
              <div className="erp-card p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/20 dark:to-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  
                  <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-display font-extrabold text-lg shrink-0 uppercase shadow-md shadow-red-600/5">
                    {selectedSupplier.name.substring(0, 2)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <h2 className="font-display font-extrabold text-base text-slate-800 dark:text-white leading-tight">{selectedSupplier.name}</h2>
                    <p className="text-xs text-slate-400">Contact Person: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSupplier.contactPerson}</span></p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 pt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5"><Phone size={13} /> {selectedSupplier.mobile}</p>
                      <p className="flex items-center gap-1.5"><MapPin size={13} /> {selectedSupplier.address || 'Address not listed'}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedSupplier.productsSupplied.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pending Payments visual badge */}
                  <div className="text-center sm:text-right shrink-0 bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                    <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-wide">Outstanding Balance</span>
                    <span className="font-display font-extrabold text-xl text-red-600 dark:text-red-400 mt-1 block">
                      ₹{selectedSupplier.pendingPayments.toLocaleString()}
                    </span>
                    
                    {selectedSupplier.pendingPayments > 0 && (
                      <button
                        onClick={() => setShowPayModal(true)}
                        className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded cursor-pointer flex items-center justify-center gap-1 mx-auto"
                      >
                        <DollarSign size={10} /> Clear Bill
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* Ledger list */}
              <div className="erp-card p-5">
                <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="text-red-600" size={16} />
                  Supplier Transactions Ledger
                </h3>

                {selectedSupplier.ledger.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No transactions recorded. Buy stock items to write ledger logs.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {[...selectedSupplier.ledger].reverse().map((entry) => (
                      <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/80 rounded-xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            entry.type === 'Purchase' 
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {entry.type === 'Purchase' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{entry.description}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {entry.date} • Type: <span className="font-bold">{entry.type}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-display font-bold text-sm ${
                            entry.type === 'Purchase' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {entry.type === 'Purchase' ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          ) : (
            <div className="erp-card p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 h-64">
              <Truck size={28} className="text-slate-300" />
              <span className="text-xs">Select a supplier partner to inspect financial balance sheets and ledgers.</span>
            </div>
          )}
        </div>

      </div>

      {/* Make Payment Modal */}
      <AnimatePresence>
        {showPayModal && selectedSupplier && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                <DollarSign className="text-red-600" size={18} />
                Record Supplier Payment
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Decrease outstanding balance accounts payable for {selectedSupplier.name}.
              </p>

              <form onSubmit={handleMakePaymentSubmit} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs space-y-1">
                  <p className="text-slate-500">Supplier: <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedSupplier.name}</span></p>
                  <p className="text-slate-500">Maximum Due: <span className="font-semibold text-red-600">Rs. {selectedSupplier.pendingPayments.toLocaleString()}</span></p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount Paid (Rs)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    max={selectedSupplier.pendingPayments}
                    placeholder={`e.g. 5000`}
                    className="erp-input py-2 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Description / Ref</label>
                  <input
                    type="text"
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                    placeholder="e.g. Paid via Bank transfer - Txn #9201"
                    className="erp-input py-2 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    {paying ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
                <Truck className="text-red-600" size={18} />
                Register New Supplier Partner
              </h2>

              <form onSubmit={handleAddSupplierSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company / Supplier Name</label>
                  <input
                    type="text"
                    value={newSupplierForm.name}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    placeholder="e.g. Exide Distributors North"
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newSupplierForm.contactPerson}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contactPerson: e.target.value })}
                      placeholder="e.g. Sanjay Kapoor"
                      className="erp-input py-2 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={newSupplierForm.mobile}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, mobile: e.target.value })}
                      placeholder="e.g. 9811122233"
                      className="erp-input py-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Office Address</label>
                  <input
                    type="text"
                    value={newSupplierForm.address}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })}
                    placeholder="e.g. Industrial Area Phase 2, New Delhi"
                    className="erp-input py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Products Supplied (Comma separated list)</label>
                  <input
                    type="text"
                    value={newSupplierForm.productsSupplied}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, productsSupplied: e.target.value })}
                    placeholder="e.g. Express 100AH, Milege 60AH"
                    className="erp-input py-2 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    Save Supplier
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
