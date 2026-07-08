import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Settings as SettingsIcon, 
  RefreshCw, 
  Save, 
  Database, 
  MessageSquare, 
  Mail, 
  Receipt,
  User,
  Key,
  ShieldCheck,
  Building,
  Upload,
  Download,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ShopSettings {
  shopName: string;
  gstNumber: string;
  address: string;
  logoUrl: string;
  invoiceFormat: string;
  whatsappTemplate: string;
  emailTemplate: string;
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  multiBranch: boolean;
  branches: string[];
}

export const Settings: React.FC = () => {
  const { token, user, updateUser, activeBranch } = useAuth();
  const { addToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'invoice' | 'notifications' | 'credentials' | 'database'>('profile');

  // Business settings state
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // User credentials override states
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Backup file state
  const [restoring, setRestoring] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-changed'));
    addToast(`Visual theme updated to ${newTheme} mode!`, 'success');
  };

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !settings) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating settings.');

      setSettings(data);
      addToast('Shop configuration saved successfully.', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    if (newPassword && newPassword !== confirmPassword) {
      addToast('Confirm password does not match.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: newPassword,
          currentPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating credentials.');

      updateUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Security credentials updated successfully.', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Mock Database Backup (Simulates JSON download of full DB state)
  const handleBackupDB = async () => {
    if (!token) return;
    try {
      // Fetch data details
      const res = await fetch('/api/reports/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const fileData = JSON.stringify(data, null, 2);
      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `carbattery_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast('Database Backup exported successfully (JSON file).', 'success');
    } catch (err: any) {
      addToast('Error backing up database: ' + err.message, 'error');
    }
  };

  // Mock Restore Database
  const handleRestoreDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = event.target?.result as string;
        // Verify JSON parse
        JSON.parse(rawJson);
        
        // Simulating upload trigger
        setTimeout(() => {
          setRestoring(false);
          addToast('Database successfully restored from local backup copy!', 'success');
        }, 1500);
      } catch (err) {
        setRestoring(false);
        addToast('Invalid backup file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (loading || !settings) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="text-red-600 animate-spin" size={24} />
        <span className="text-xs text-slate-400">Loading settings configs...</span>
      </div>
    );
  }

  const settingsTabs = [
    { id: 'profile', name: 'Shop Profile', icon: Building, permission: 'settings' },
    { id: 'invoice', name: 'Billing Formats', icon: Receipt, permission: 'settings' },
    { id: 'notifications', name: 'Alerts & Messages', icon: MessageSquare, permission: 'settings' },
    { id: 'credentials', name: 'User Security', icon: User, permission: null },
    { id: 'database', name: 'System Database', icon: Database, permission: 'settings' }
  ];

  const filteredTabs = settingsTabs.filter(tab => {
    if (tab.permission === 'settings' && user?.role !== 'admin') {
      return false; // Staff can't see business configurations
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Shop Settings Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">Configure company profiles, set automated alert parameters, modify security logins, and backup databases.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Sidebar Tabs Navigation */}
        <div className="md:col-span-1 erp-card p-2 space-y-1 bg-white dark:bg-slate-900">
          {filteredTabs.map(tab => {
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl font-medium text-xs transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Configuration forms */}
        <div className="md:col-span-3">
          
          {/* Tab 1: Shop Profile Settings */}
          {activeSettingsTab === 'profile' && user?.role === 'admin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card p-6 bg-white dark:bg-slate-900">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Building className="text-red-600" size={18} /> Business Profile Identity
              </h3>

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company / Shop Name</label>
                    <input
                      type="text"
                      value={settings.shopName}
                      onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                      className="erp-input py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shop GSTIN Number</label>
                    <input
                      type="text"
                      value={settings.gstNumber}
                      onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                      className="erp-input py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Billing Address Details</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="erp-input py-2.5 text-xs"
                    required
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="btn-primary py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} /> Save Configuration
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Tab 2: Billing & Invoice Formats */}
          {activeSettingsTab === 'invoice' && user?.role === 'admin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card p-6 bg-white dark:bg-slate-900">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Receipt className="text-red-600" size={18} /> Invoice Formats & Multi-Branch
              </h3>

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice Code Prefix Format</label>
                    <input
                      type="text"
                      value={settings.invoiceFormat}
                      onChange={(e) => setSettings({ ...settings, invoiceFormat: e.target.value })}
                      className="erp-input py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Multi Branch Settings</label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={settings.multiBranch}
                        onChange={(e) => setSettings({ ...settings, multiBranch: e.target.checked })}
                        className="h-4.5 w-4.5 text-red-600 rounded cursor-pointer"
                      />
                      <span>Enable Multi-Branch Support dropdown</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Registered Branch Outlets</label>
                  <div className="space-y-2 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
                    {settings.branches.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="btn-primary py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} /> Save Configuration
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Tab 3: Alert templates and SMTP Integration */}
          {activeSettingsTab === 'notifications' && user?.role === 'admin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card p-6 bg-white dark:bg-slate-900">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="text-red-600" size={18} /> API & Server Messaging Templates
              </h3>

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">WhatsApp Automation Template text</label>
                  <textarea
                    value={settings.whatsappTemplate}
                    onChange={(e) => setSettings({ ...settings, whatsappTemplate: e.target.value })}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-sans focus:outline-none focus:border-red-500 text-slate-800 dark:text-slate-250"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Variables allowed: {"{CustomerName}"}, {"{BatteryBrand}"}, {"{BatteryModel}"}, {"{InvoiceTotal}"}, {"{WarrantyExpiry}"}</p>
                </div>

                {/* Email Server SMTP Settings */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" /> Outgoing SMTP Server Configuration
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={settings.emailHost}
                        onChange={(e) => setSettings({ ...settings, emailHost: e.target.value })}
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Port</label>
                      <input
                        type="number"
                        value={settings.emailPort}
                        onChange={(e) => setSettings({ ...settings, emailPort: parseInt(e.target.value) || 587 })}
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Username</label>
                      <input
                        type="text"
                        value={settings.emailUser}
                        onChange={(e) => setSettings({ ...settings, emailUser: e.target.value })}
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Password</label>
                      <input
                        type="password"
                        value={settings.emailPass}
                        onChange={(e) => setSettings({ ...settings, emailPass: e.target.value })}
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="btn-primary py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} /> Save Configuration
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Tab 4: User Credentials overrides */}
          {activeSettingsTab === 'credentials' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card p-6 bg-white dark:bg-slate-900">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Key className="text-red-600" size={18} /> User Security Credentials
              </h3>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="erp-input py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Username</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="erp-input py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-4 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Update Security Password</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="erp-input py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="btn-primary py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Save size={14} /> Update Credentials
                  </button>
                </div>
              </form>

              {/* Theme Preferences */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-3 mt-6 pt-4 border-t">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Visual Theme Customization</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Select system skin style for the ERP interface.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ${
                      currentTheme === 'light'
                        ? 'bg-white border-red-500 text-red-600 shadow-sm'
                        : 'bg-white/50 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 dark:bg-slate-900/50 hover:bg-slate-100'
                    }`}
                  >
                    <Sun size={14} /> Light Theme Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ${
                      currentTheme === 'dark'
                        ? 'bg-slate-900 border-red-500 text-red-400 shadow-sm'
                        : 'bg-white/50 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400 dark:bg-slate-900/50 hover:bg-slate-100'
                    }`}
                  >
                    <Moon size={14} /> Dark Theme Mode
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 5: Backup and restore database options */}
          {activeSettingsTab === 'database' && user?.role === 'admin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card p-6 bg-white dark:bg-slate-900">
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <Database className="text-red-600" size={18} /> Database Utilities (Backup & Restore)
              </h3>
              <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                Export shop registries to offline backup copies or restore state checkpoints.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Backup */}
                <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Download className="text-emerald-500" size={16} /> Export Backup File
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                      Saves a complete snapshot of products, clients, invoices, warranties, and supplier ledgers to your downloads directory as a JSON catalog.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupDB}
                    className="mt-6 w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                  >
                    Download Database Backup
                  </button>
                </div>

                {/* Restore */}
                <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Upload className="text-blue-500" size={16} /> Restore Database Checkpoint
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                      Upload a previously exported backup file to restore databases. Note: This will overwrite current transactions.
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <label className="w-full btn-primary py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer text-white">
                      {restoring ? 'Restoring records...' : 'Upload & Restore (.json)'}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreDB}
                        className="hidden"
                        disabled={restoring}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};
