import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  RefreshCw, 
  Key, 
  Mail, 
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

export const Staff: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    permissions: ['billing', 'customers'] as string[]
  });

  const availablePermissions = [
    { key: 'billing', label: 'Billing & POS Invoices' },
    { key: 'inventory', label: 'Inventory & Stock Control' },
    { key: 'customers', label: 'Customers CRM & Service' },
    { key: 'reports', label: 'Reports Download' },
    { key: 'settings', label: 'Shop Settings Override' }
  ];

  const fetchStaff = async () => {
    if (!token || currentUser?.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await fetch('/api/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load user credentials registry.');
      const data = await res.json();
      setStaffList(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

  // Permission toggler
  const handlePermissionToggle = (permKey: string) => {
    if (formData.permissions.includes(permKey)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permKey)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permKey]
      });
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      permissions: ['billing', 'customers']
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error creating staff profile.');

      addToast(`${formData.name} successfully registered as ${formData.role}!`, 'success');
      setShowAddModal(false);
      fetchStaff();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const openEditModal = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '', // blank password unless overriding
      role: staff.role,
      permissions: staff.permissions
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedStaff) return;

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions
      };
      
      // Send password only if explicitly set to override
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating staff details.');

      addToast(`Staff details updated successfully.`, 'success');
      setShowEditModal(false);
      fetchStaff();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Protect view check
  if (currentUser?.role !== 'admin') {
    return (
      <div className="erp-card p-8 border-red-200 text-center max-w-lg mx-auto flex flex-col items-center gap-3 mt-12 bg-white">
        <ShieldAlert className="text-red-600 animate-bounce" size={32} />
        <h2 className="font-display font-bold text-base text-slate-800">Admin Clearance Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Access Denied: The current user role does not possess privileges to edit user roles or settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Staff Management & Permissions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Administrate profiles, adjust permission levels, and secure logins.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 btn-primary py-2 text-xs font-semibold cursor-pointer"
        >
          <Plus size={16} /> Add Staff Account
        </button>
      </div>

      {/* Main Table List */}
      <div className="erp-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <RefreshCw className="text-red-600 animate-spin" size={24} />
            <span className="text-xs text-slate-400">Loading user profiles...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No staff accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="erp-th">Name</th>
                  <th className="erp-th">Email</th>
                  <th className="erp-th">Role</th>
                  <th className="erp-th">Assigned Permissions</th>
                  <th className="erp-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="erp-tr">
                    <td className="erp-td font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center justify-center font-display font-bold text-xs uppercase">
                          {staff.name.substring(0, 2)}
                        </div>
                        {staff.name} {staff.id === currentUser.id ? '(You)' : ''}
                      </div>
                    </td>
                    <td className="erp-td font-medium text-slate-500">{staff.email}</td>
                    <td className="erp-td">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        staff.role === 'admin' 
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="erp-td">
                      <div className="flex flex-wrap gap-1">
                        {staff.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-medium">Full Access</span>
                        ) : staff.permissions.length === 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-[10px] text-red-500 font-medium italic">No Access</span>
                        ) : (
                          staff.permissions.map(p => (
                            <span key={p} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-semibold capitalize">
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="erp-td text-right">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="p-1.5 rounded hover:bg-slate-50 text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Edit Permissions"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
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
                <Plus className="text-red-600" size={18} />
                Register New Staff Profile
              </h2>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Username</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. ramesh@carbattery.com"
                      className="pl-11 erp-input py-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Password</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="pl-11 erp-input py-2 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Role Privilege</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="erp-input py-2 text-xs"
                  >
                    <option value="staff">Staff Account</option>
                    <option value="admin">System Admin (Full Access)</option>
                  </select>
                </div>

                {/* Permissions Checkboxes */}
                {formData.role === 'staff' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Module Access Permissions</label>
                    <div className="space-y-2 border border-slate-100 dark:border-slate-800 p-3 rounded-xl max-h-32 overflow-y-auto">
                      {availablePermissions.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(p.key)}
                            onChange={() => handlePermissionToggle(p.key)}
                            className="h-4.5 w-4.5 text-red-655 rounded cursor-pointer"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

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
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {showEditModal && selectedStaff && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
                <Edit2 className="text-red-600" size={18} />
                Edit Staff Account & Clearance
              </h2>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Username</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Password (Leave blank to keep current)</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="pl-11 erp-input py-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Role Privilege</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="erp-input py-2 text-xs"
                  >
                    <option value="staff">Staff Account</option>
                    <option value="admin">System Admin (Full Access)</option>
                  </select>
                </div>

                {/* Permissions Checkboxes */}
                {formData.role === 'staff' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Module Access Permissions</label>
                    <div className="space-y-2 border border-slate-100 dark:border-slate-800 p-3 rounded-xl max-h-32 overflow-y-auto">
                      {availablePermissions.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(p.key)}
                            onChange={() => handlePermissionToggle(p.key)}
                            className="h-4.5 w-4.5 text-red-655 rounded cursor-pointer"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    Save Changes
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
