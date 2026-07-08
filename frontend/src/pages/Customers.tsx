import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Users, 
  Search, 
  RefreshCw, 
  History, 
  Award, 
  Plus, 
  CheckCircle,
  Car,
  Wrench,
  ChevronRight,
  PhoneCall,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  vehicleNumber: string;
  loyaltyPoints: number;
  installationHistory: Array<{
    batteryModel: string;
    brand: string;
    date: string;
  }>;
  serviceRecords: Array<{
    date: string;
    description: string;
    vehicleNumber: string;
  }>;
}

export const Customers: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Customer for Profile View
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Add Service Record form modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceVehicleNum, setServiceVehicleNum] = useState('');

  const fetchCustomers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch customer ledger.');
      const data = await res.json();
      setCustomers(data);
      
      // Auto select the first customer in list if none selected
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCustomer) return;

    if (!serviceDescription) {
      addToast('Please enter service record details.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: serviceDescription,
          vehicleNumber: serviceVehicleNum || selectedCustomer.vehicleNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error saving service entry.');

      addToast('Service record logged successfully.', 'success');
      setServiceDescription('');
      setServiceVehicleNum('');
      setShowServiceModal(false);
      
      // Refresh current customer view
      setSelectedCustomer(data);
      
      // Refresh global list
      fetchCustomers();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Filtered List
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm) ||
    c.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Customer CRM & Service logs</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">Manage loyalty programs, search client purchases, and track battery installations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Customer List */}
        <div className="lg:col-span-1 erp-card overflow-hidden flex flex-col h-[calc(100vh-14rem)] bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, mobile, vehicle..."
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
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No customer profiles match criteria.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`w-full p-4 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                      isSelected 
                        ? 'bg-red-50/15 dark:bg-red-950/10 border-l-4 border-red-600' 
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{cust.name}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <PhoneCall size={10} /> {cust.mobile}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40">
                        <Award size={10} /> {cust.loyaltyPoints} pts
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Selected Customer Details Sheet */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Card Header */}
              <div className="erp-card p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/20 dark:to-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar */}
                  <div className="h-16 w-16 min-w-16 rounded-3xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-display font-extrabold text-2xl uppercase shadow-md shadow-red-600/5">
                    {selectedCustomer.name.substring(0, 2)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display font-extrabold text-lg text-slate-800 dark:text-white leading-tight">{selectedCustomer.name}</h2>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        ID: {selectedCustomer.id.replace('cust_', '')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5 font-medium">
                        <PhoneCall size={14} className="text-slate-400" />
                        {selectedCustomer.mobile}
                      </p>
                      <p className="flex items-center gap-1.5 font-medium">
                        <Car size={14} className="text-slate-400" />
                        Plate: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedCustomer.vehicleNumber || 'N/A'}</span>
                      </p>
                      {selectedCustomer.address && (
                        <p className="flex items-center gap-1.5 font-medium col-span-1 sm:col-span-3">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          {selectedCustomer.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-center sm:text-right shrink-0 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                    <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-wide">Loyalty Account</span>
                    <span className="font-display font-extrabold text-2xl text-amber-600 dark:text-amber-400 mt-1 block">
                      {selectedCustomer.loyaltyPoints}
                    </span>
                    <span className="text-[9px] text-slate-400">Active Balance Points</span>
                  </div>
                </div>
              </div>

              {/* Purchase and Service timelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Installation History */}
                <div className="erp-card p-5">
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <History className="text-red-600" size={16} />
                    Battery Purchase History
                  </h3>

                  {selectedCustomer.installationHistory.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No battery purchase records logged.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedCustomer.installationHistory.map((inst, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                          <div className="h-7 w-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                            <Wrench size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {inst.brand} - {inst.batteryModel}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Installed: {inst.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Vehicle Service Records */}
                <div className="erp-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                      <Wrench className="text-red-600" size={16} />
                      Vehicle Service Records
                    </h3>
                    <button
                      onClick={() => {
                        setServiceVehicleNum(selectedCustomer.vehicleNumber);
                        setShowServiceModal(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      <Plus size={12} /> Log Service
                    </button>
                  </div>

                  {selectedCustomer.serviceRecords.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No service records logged for this vehicle.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                      {selectedCustomer.serviceRecords.map((rec, idx) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 pb-3 last:pb-0">
                          {/* Dot marker */}
                          <span className="absolute -left-1.5 top-0.5 h-3 w-3 bg-red-600 border-2 border-white dark:border-slate-900 rounded-full"></span>
                          <span className="text-[9px] block text-slate-400 font-bold">{rec.date} {rec.vehicleNumber ? `[${rec.vehicleNumber}]` : ''}</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          ) : (
            <div className="erp-card p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 h-64">
              <Users size={28} className="text-slate-300" />
              <span className="text-xs">Select a customer profile to inspect detailed service records.</span>
            </div>
          )}
        </div>

      </div>

      {/* Log Service Modal */}
      <AnimatePresence>
        {showServiceModal && selectedCustomer && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                <Wrench className="text-red-600" size={18} />
                Log Vehicle Service Record
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Record Distilled water topups, gravities, or voltage checking.
              </p>

              <form onSubmit={handleAddServiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Plate No.</label>
                  <input
                    type="text"
                    value={serviceVehicleNum}
                    onChange={(e) => setServiceVehicleNum(e.target.value)}
                    placeholder="e.g. DL3CA1234"
                    className="erp-input py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Details & Measurements</label>
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="e.g. Checked gravity (1.240), topped up distilled water, greased battery terminals."
                    rows={4}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-sans focus:outline-none focus:border-red-500 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    Save Entry
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
