import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  RefreshCw, 
  Barcode, 
  Truck,
  Calendar,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  brand: string;
  model: string;
  purchasePrice: number;
}

interface Purchase {
  id: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productBrand: string;
  productModel: string;
  quantity: number;
  purchaseCost: number;
  invoiceNumber: string;
  date: string;
}

export const Purchases: React.FC = () => {
  const { token } = useAuth();
  const { addToast, refreshAlerts } = useNotifications();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    supplierId: '',
    productId: '',
    quantity: '10',
    purchaseCost: '',
    invoiceNumber: ''
  });

  const fetchPurchases = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/purchases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersAndProducts = async () => {
    if (!token) return;
    try {
      const resS = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resP = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resS.ok && resP.ok) {
        setSuppliers(await resS.json());
        setProducts(await resP.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliersAndProducts();
  }, [token]);

  // Estimate cost based on product purchasePrice
  useEffect(() => {
    if (formData.productId && formData.quantity) {
      const prod = products.find(p => p.id === formData.productId);
      if (prod) {
        const calculatedCost = prod.purchasePrice * (Number(formData.quantity) || 1);
        setFormData(prev => ({ ...prev, purchaseCost: String(calculatedCost) }));
      }
    }
  }, [formData.productId, formData.quantity, products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formData.supplierId || !formData.productId || !formData.quantity || !formData.purchaseCost) {
      addToast('Please fill in all mandatory purchase details.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error saving restock invoice.');

      addToast(`Restocked ${formData.quantity} batteries successfully!`, 'success');
      setFormData({ supplierId: '', productId: '', quantity: '10', purchaseCost: '', invoiceNumber: '' });
      setShowAddModal(false);
      fetchPurchases();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Purchases & Restocks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Record incoming supply stock shipments, adjust available warehouse SKUs, and update accounts payable.</p>
        </div>
        <button
          onClick={() => {
            fetchSuppliersAndProducts();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 btn-primary py-2 text-xs font-semibold"
        >
          <Plus size={16} /> Log Incoming Stock
        </button>
      </div>

      {/* Table grid */}
      <div className="erp-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <RefreshCw className="text-red-600 animate-spin" size={24} />
            <span className="text-xs text-slate-400 font-medium">Assembling restock ledgers...</span>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <FolderOpen size={24} className="text-slate-350" />
            <span>No incoming purchases logged in history database.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="erp-th">Purchase ID</th>
                  <th className="erp-th">Date</th>
                  <th className="erp-th">Supplier Partner</th>
                  <th className="erp-th">Product details</th>
                  <th className="erp-th text-center">Quantity</th>
                  <th className="erp-th">Purchase Invoice</th>
                  <th className="erp-th text-right font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="erp-tr">
                    <td className="erp-td font-semibold text-red-600 dark:text-red-400">{pur.purchaseId}</td>
                    <td className="erp-td text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {pur.date}
                      </div>
                    </td>
                    <td className="erp-td font-medium text-slate-800 dark:text-slate-200">{pur.supplierName}</td>
                    <td className="erp-td text-xs">
                      <div className="flex items-center gap-1">
                        <Barcode size={12} className="text-slate-400" />
                        <span className="font-semibold text-slate-600 dark:text-slate-400">{pur.productBrand}</span> {pur.productModel}
                      </div>
                    </td>
                    <td className="erp-td text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                        {pur.quantity} Units
                      </span>
                    </td>
                    <td className="erp-td font-medium text-slate-500">{pur.invoiceNumber}</td>
                    <td className="erp-td text-right font-bold text-slate-800 dark:text-slate-200">
                      ₹{pur.purchaseCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Restock Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                <ShoppingCart className="text-red-600 animate-pulse-slow" size={18} />
                Log Incoming Supply Restock
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Updating restocks will raise outstanding balance due to the supplier ledger.
              </p>

              <form onSubmit={handleAddPurchaseSubmit} className="space-y-3.5">
                {/* Supplier selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Supplier</label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    className="erp-input py-2 text-xs"
                    required
                  >
                    <option value="">-- Choose Supplier Partner --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Product selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Battery SKU Model</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    className="erp-input py-2 text-xs"
                    required
                  >
                    <option value="">-- Choose Product Model --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.brand} - {p.model}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity Restocked</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min={1}
                      className="erp-input py-2 text-xs font-semibold text-center"
                      required
                    />
                  </div>

                  {/* Supplier Invoice */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Bill Invoice No.</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. EX-9921"
                      className="erp-input py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Purchase Cost */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Bill Cost (Rs)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">Rs.</span>
                    <input
                      type="number"
                      name="purchaseCost"
                      value={formData.purchaseCost}
                      onChange={handleInputChange}
                      className="pl-10 erp-input py-2 text-xs font-extrabold text-red-600 dark:text-red-400"
                      required
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 italic mt-1">Cost is auto-estimated based on wholesale product values.</p>
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
                    disabled={submitting || !formData.supplierId || !formData.productId}
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    {submitting ? 'Saving...' : 'Add Stock Qty'}
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
