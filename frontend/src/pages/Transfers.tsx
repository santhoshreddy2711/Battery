import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  ArrowLeftRight, 
  Plus, 
  RefreshCw, 
  GitPullRequest, 
  MapPin, 
  Layers, 
  CheckCircle,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  brand: string;
  model: string;
  quantity: number;
  branch: string;
}

interface TransferLog {
  id: string;
  productId: string;
  productBrand: string;
  productModel: string;
  quantity: number;
  sourceBranch: string;
  destinationBranch: string;
  date: string;
  status: 'Dispatched' | 'Received';
}

export const Transfers: React.FC = () => {
  const { token, activeBranch } = useAuth();
  const { addToast } = useNotifications();

  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Transfer form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [transferQty, setTransferQty] = useState('1');

  // Hardcoded outlet branches matching Settings
  const branchOutlets = ['New Delhi Branch (HQ)', 'Noida Service Center', 'Gurugram Outlet'].filter(
    b => b !== activeBranch
  );

  const fetchInventory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/inventory?branch=${encodeURIComponent(activeBranch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfersLog = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/transfers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter transfers involving active branch
        const filtered = data.filter((t: TransferLog) => 
          t.sourceBranch === activeBranch || t.destinationBranch === activeBranch
        );
        // Sort descending by date/id
        filtered.sort((a: TransferLog, b: TransferLog) => b.id.localeCompare(a.id));
        setTransfers(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await fetchInventory();
    await fetchTransfersLog();
  };

  useEffect(() => {
    loadData();
    // Reset selected product
    setSelectedProductId('');
    setTargetBranch(branchOutlets[0] || '');
    setTransferQty('1');
  }, [token, activeBranch]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedProductId || !targetBranch || !transferQty) {
      addToast('Please fill all transfer fields.', 'warning');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    if (selectedProduct.quantity < Number(transferQty)) {
      addToast('Insufficient stock available to transfer.', 'warning');
      return;
    }

    setBtnLoading(true);
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: Number(transferQty),
          sourceBranch: activeBranch,
          destinationBranch: targetBranch
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error processing transfer.');

      addToast(`Successfully transferred ${transferQty} batteries to ${targetBranch}!`, 'success');
      setSelectedProductId('');
      setTransferQty('1');
      loadData();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setBtnLoading(false);
    }
  };

  const selectedProductDetails = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Inter-Branch Stock Transfers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Dispatch inventory parts between Delhi HQ, Noida, and Gurugram Service Centers.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
        >
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Transfer Dispatch terminal */}
        <div className="lg:col-span-1">
          <div className="erp-card p-5">
            <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ArrowLeftRight className="text-red-600" size={18} />
              Dispatch Stock
            </h2>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              
              {/* Source Branch info */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Outlet (Active)</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MapPin size={14} className="text-red-500 shrink-0" />
                  {activeBranch}
                </div>
              </div>

              {/* Destination selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Branch</label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="erp-input py-2 text-xs"
                  required
                >
                  {branchOutlets.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  {branchOutlets.length === 0 && (
                    <option value="">No other branches registered</option>
                  )}
                </select>
              </div>

              {/* Product SKU selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Battery SKU</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="erp-input py-2 text-xs"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.brand} {p.model} (Avail: {p.quantity} units)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  min={1}
                  max={selectedProductDetails ? selectedProductDetails.quantity : undefined}
                  className="erp-input py-2 text-xs"
                  required
                />
                {selectedProductDetails && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Maximum units allowed: {selectedProductDetails.quantity}
                  </p>
                )}
              </div>

              {/* Dispatch button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={btnLoading || !selectedProductId || branchOutlets.length === 0}
                  className="w-full btn-primary py-3 text-xs font-bold tracking-wide shadow-lg shadow-red-600/10 cursor-pointer disabled:opacity-50"
                >
                  {btnLoading ? 'Processing Dispatch...' : 'Dispatch Inter-Branch Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 2 Columns: Transfer Registry log */}
        <div className="lg:col-span-2">
          <div className="erp-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Inter-Branch Dispatch Registry</h3>
              <span className="px-2.5 py-0.5 text-[10px] bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 font-bold rounded">
                Branch Feeds
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <RefreshCw className="text-red-600 animate-spin" size={24} />
                <span className="text-xs text-slate-400 font-medium">Querying inter-branch transfers ledger...</span>
              </div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No branch transfers recorded in this branch session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th className="erp-th">Transfer ID</th>
                      <th className="erp-th">Date</th>
                      <th className="erp-th">Item Description</th>
                      <th className="erp-th text-center">Qty</th>
                      <th className="erp-th">From Outlet</th>
                      <th className="erp-th">To Outlet</th>
                      <th className="erp-th text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transfers.map((tx) => (
                      <tr key={tx.id} className="erp-tr">
                        <td className="erp-td font-semibold text-slate-600 dark:text-slate-400">{tx.id}</td>
                        <td className="erp-td">{tx.date}</td>
                        <td className="erp-td font-semibold text-slate-800 dark:text-slate-200">
                          <span className="text-red-600 dark:text-red-400 mr-1">{tx.productBrand}</span> {tx.productModel}
                        </td>
                        <td className="erp-td text-center font-bold text-slate-800 dark:text-white">{tx.quantity}</td>
                        <td className="erp-td text-xs font-medium text-slate-500">{tx.sourceBranch}</td>
                        <td className="erp-td text-xs font-medium text-slate-500">{tx.destinationBranch}</td>
                        <td className="erp-td text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 flex inline-flex items-center gap-1">
                            <CheckCircle size={10} /> {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
