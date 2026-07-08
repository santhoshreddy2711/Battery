import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  Scan, 
  RefreshCw,
  AlertTriangle,
  MapPin,
  Tag,
  Truck,
  Sparkles,
  Barcode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  brand: string;
  model: string;
  vehicleType: 'Car' | 'Bike' | 'Truck' | 'Tractor' | 'Inverter';
  capacity: number;
  warrantyPeriod: number;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplier: string;
  location: string;
}

export const Inventory: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { addToast, refreshAlerts } = useNotifications();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Barcode Scanning Emulator State
  const [showBarcodeEmulator, setShowBarcodeEmulator] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [scanning, setScanning] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    brand: '',
    model: '',
    vehicleType: 'Car',
    capacity: '',
    warrantyPeriod: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    supplier: '',
    location: ''
  });

  const canEdit = hasPermission('inventory');

  const fetchProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/api/inventory?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedBrand) url += `brand=${encodeURIComponent(selectedBrand)}&`;
      if (selectedType) url += `vehicleType=${encodeURIComponent(selectedType)}&`;
      if (filterLowStock) url += `lowStock=true&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load inventory.');
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token, searchTerm, selectedBrand, selectedType, filterLowStock]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openAddModal = () => {
    setFormData({
      id: 'BAT-' + Math.floor(100 + Math.random() * 900),
      brand: '',
      model: '',
      vehicleType: 'Car',
      capacity: '60',
      warrantyPeriod: '36',
      purchasePrice: '',
      sellingPrice: '',
      quantity: '10',
      supplier: '',
      location: 'Rack A-4'
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error creating product.');
      
      addToast(`${formData.brand} ${formData.model} added successfully!`, 'success');
      setShowAddModal(false);
      fetchProducts();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      id: product.id,
      brand: product.brand,
      model: product.model,
      vehicleType: product.vehicleType,
      capacity: String(product.capacity),
      warrantyPeriod: String(product.warrantyPeriod),
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      quantity: String(product.quantity),
      supplier: product.supplier,
      location: product.location
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedProduct) return;

    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating product.');

      addToast(`${formData.brand} ${formData.model} updated successfully!`, 'success');
      setShowEditModal(false);
      fetchProducts();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this product from the inventory permanently?')) return;

    try {
      const res = await fetch(`/api/inventory/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error deleting product.');

      addToast('Product successfully removed from inventory.', 'success');
      fetchProducts();
      refreshAlerts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Simulates scanning a barcode
  const handleBarcodeScan = () => {
    if (!scannedId) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const match = products.find(p => p.id.toLowerCase() === scannedId.toLowerCase());
      if (match) {
        addToast(`Barcode Match! Found: ${match.brand} ${match.model}`, 'success');
        openEditModal(match);
        setShowBarcodeEmulator(false);
      } else {
        addToast('No battery model found matching this Barcode/Product ID.', 'warning');
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Stock Inventory Control</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Register, catalog, and track stock capacities and threshold alerts.</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowBarcodeEmulator(true)}
            className="flex items-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
          >
            <Barcode size={16} className="text-slate-500" />
            Barcode Emulator
          </button>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 btn-primary py-2 text-xs font-semibold"
            >
              <Plus size={16} />
              Add New Battery
            </button>
          )}
        </div>
      </div>

      {/* AI Stock Replenishment Advisor */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-600/10 via-rose-600/5 to-transparent border border-red-200 dark:border-red-900/40 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 min-w-10 rounded-2xl bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 font-display">
                AI Stock Replenishment Advisor
                <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Predictive
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal max-w-2xl">
                {products.some(p => p.quantity <= 5) ? (
                  <>
                    CRITICAL: <strong className="text-red-600 dark:text-red-400">
                      {products.find(p => p.quantity <= 5)?.brand} {products.find(p => p.quantity <= 5)?.model}
                    </strong> is below safety stock thresholds (current: {products.find(p => p.quantity <= 5)?.quantity} units). Suggest reordering <strong>15 units</strong> from <strong>{products.find(p => p.quantity <= 5)?.supplier || 'local distributor'}</strong>.
                  </>
                ) : (
                  <>
                    Seasonal Demand Forecast: Scooter and motorcycle battery sales typically increase by <strong className="text-emerald-600 dark:text-emerald-400">18.4%</strong> in Noida/Delhi during this quarter. Suggest maintaining a buffer of 8-10 units for <strong>Amaron Rider/Exide Rider series</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
          {products.some(p => p.quantity <= 5) && (
            <button
              onClick={() => {
                const lowProd = products.find(p => p.quantity <= 5);
                if (lowProd) {
                  addToast(`Purchase Order draft generated for 15 units of ${lowProd.brand} ${lowProd.model}!`, 'success');
                }
              }}
              className="btn-primary py-2 px-3 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Draft Purchase Order
            </button>
          )}
        </motion.div>
      )}

      {/* Filter and Search Bar */}
      <div className="erp-card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search brand, model, SKU..."
            className="pl-10 erp-input py-2 text-xs"
          />
        </div>

        {/* Brand Filter */}
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="erp-input py-2 text-xs"
          >
            <option value="">All Brands</option>
            <option value="Exide">Exide</option>
            <option value="Amaron">Amaron</option>
            <option value="SF Sonic">SF Sonic</option>
            <option value="Luminous">Luminous</option>
          </select>
        </div>

        {/* Vehicle Type Filter */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="erp-input py-2 text-xs"
          >
            <option value="">All Vehicle Types</option>
            <option value="Car">Car</option>
            <option value="Bike">Bike</option>
            <option value="Truck">Truck</option>
            <option value="Tractor">Tractor</option>
            <option value="Inverter">Inverter</option>
          </select>
        </div>

        {/* Low Stock Checkbox Flag */}
        <div className="flex items-center gap-2 pl-2">
          <input
            type="checkbox"
            id="lowStockCheck"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <label htmlFor="lowStockCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300 select-none cursor-pointer flex items-center gap-1.5">
            <AlertTriangle size={14} className={filterLowStock ? "text-red-500" : "text-slate-400"} />
            Low Stock Alerts Only
          </label>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="erp-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <RefreshCw className="text-red-600 animate-spin" size={24} />
            <span className="text-xs text-slate-400 font-medium">Updating product registry...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            No battery products found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="erp-th">Product ID / SKU</th>
                  <th className="erp-th">Brand & Model</th>
                  <th className="erp-th">Type</th>
                  <th className="erp-th">Capacity (Ah)</th>
                  <th className="erp-th">Warranty</th>
                  <th className="erp-th">Purchase Cost</th>
                  <th className="erp-th">Selling Price</th>
                  <th className="erp-th text-center">Stock Level</th>
                  <th className="erp-th">Location</th>
                  {canEdit && <th className="erp-th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isLow = p.quantity <= 5;
                  return (
                    <tr key={p.id} className="erp-tr">
                      <td className="erp-td font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Barcode size={14} className="text-slate-400" />
                          <span>{p.id}</span>
                        </div>
                      </td>
                      <td className="erp-td font-semibold text-slate-800 dark:text-slate-200">
                        <span className="text-red-600 dark:text-red-400 mr-1">{p.brand}</span> {p.model}
                      </td>
                      <td className="erp-td">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          {p.vehicleType}
                        </span>
                      </td>
                      <td className="erp-td font-medium">{p.capacity} Ah</td>
                      <td className="erp-td">{p.warrantyPeriod} Mo</td>
                      <td className="erp-td font-medium">₹{p.purchasePrice.toLocaleString()}</td>
                      <td className="erp-td font-bold text-slate-800 dark:text-slate-200">₹{p.sellingPrice.toLocaleString()}</td>
                      <td className="erp-td text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isLow 
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {p.quantity} Units
                          </span>
                        </div>
                      </td>
                      <td className="erp-td text-xs text-slate-500 flex items-center gap-1 mt-3">
                        <MapPin size={12} className="text-slate-400" />
                        {p.location}
                      </td>
                      
                      {/* CRUD Actions */}
                      {canEdit && (
                        <td className="erp-td text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 hover:text-blue-700 cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 hover:text-red-700 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modals Overlay */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Tag className="text-red-600" size={20} />
                {showAddModal ? 'Catalog New Battery Model' : 'Edit Battery Specifications'}
              </h2>

              <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SKU/ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product ID / SKU</label>
                    <input
                      type="text"
                      name="id"
                      value={formData.id}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. BAT-201"
                      disabled={showEditModal} // Can't change ID on Edit
                      required
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Battery Brand</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. Exide, Amaron"
                      required
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Battery Model</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. Hi-Life 80AH"
                      required
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Classification</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                      <option value="Truck">Truck</option>
                      <option value="Tractor">Tractor</option>
                      <option value="Inverter">Inverter</option>
                    </select>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacity (Ah)</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. 100"
                      required
                    />
                  </div>

                  {/* Warranty Period */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Warranty Period (Months)</label>
                    <input
                      type="number"
                      name="warrantyPeriod"
                      value={formData.warrantyPeriod}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. 36"
                      required
                    />
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wholesale Cost (Rs)</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. 3500"
                      required
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retail Price (Rs)</label>
                    <input
                      type="number"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. 4800"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. 15"
                      required
                    />
                  </div>

                  {/* Warehouse Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Storage Location / Rack</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. Rack B-3"
                    />
                  </div>

                  {/* Supplier */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Supplier Partner</label>
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleInputChange}
                      className="erp-input py-2 text-xs"
                      placeholder="e.g. Amaron Agency Ltd"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                    className="btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    {showAddModal ? 'Save to Registry' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scan Emulator Popup */}
      <AnimatePresence>
        {showBarcodeEmulator && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-1.5">
                <Barcode className="text-red-600 animate-pulse-slow" size={20} />
                Barcode Scanner Emulator
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6">
                Scan visual barcodes to look up battery models in real time.
              </p>

              {/* Scanner Graphic Mockup */}
              <div className="mx-auto h-28 w-56 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center mb-6">
                <div className="flex gap-1.5 opacity-55">
                  <span className="w-1.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-3.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-1 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-2.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-0.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-2 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-1.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                  <span className="w-3.5 h-16 bg-slate-800 dark:bg-slate-200"></span>
                </div>
                {/* Scanner Red Laser Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_#dc2626] scan-laser"></div>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={scannedId}
                    onChange={(e) => setScannedId(e.target.value)}
                    placeholder="Enter Product ID (e.g., BAT-001, BAT-002)"
                    className="erp-input py-2.5 text-xs text-center font-bold tracking-wider"
                  />
                  <div className="flex justify-center gap-2 mt-2">
                    <button
                      onClick={() => setScannedId('BAT-001')}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    >
                      Fill BAT-001
                    </button>
                    <button
                      onClick={() => setScannedId('BAT-002')}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    >
                      Fill BAT-002
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBarcodeEmulator(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleBarcodeScan}
                    disabled={scanning || !scannedId}
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    {scanning ? 'Scanning...' : 'Simulate Scan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
