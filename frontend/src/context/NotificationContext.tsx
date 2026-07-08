import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface NotificationContextType {
  alerts: AlertItem[];
  toasts: ToastItem[];
  addToast: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
  removeToast: (id: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  refreshAlerts: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Function to show toast message
  const addToast = useCallback((message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const markAllAlertsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  // Fetch metrics and update alerts list based on DB state
  const refreshAlerts = useCallback(async () => {
    if (!token) return;

    try {
      // 1. Fetch dashboard metrics for inventory and suppliers
      const resDash = await fetch('/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resWarr = await fetch('/api/warranty', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!resDash.ok || !resWarr.ok) return;

      const dash = await resDash.json();
      const warranties = await resWarr.json();
      
      const newAlerts: AlertItem[] = [];
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      // Low Stock Alerts
      const lowStockProducts = dash.kpis.lowStockAlerts;
      if (lowStockProducts > 0) {
        newAlerts.push({
          id: 'low_stock_summary',
          type: 'error',
          title: 'Low Stock Alert',
          message: `${lowStockProducts} product model(s) are running below critical levels (<=5 units).`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }

      // Supplier Pending Payment alert
      const pendingPay = dash.kpis.totalPendingPayments;
      if (pendingPay > 20000) {
        newAlerts.push({
          id: 'pending_payment_summary',
          type: 'warning',
          title: 'High Pending Payments',
          message: `Outstanding supplier bills total Rs. ${pendingPay.toLocaleString()}. Check accounts ledger.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }

      // Warranty Expiry Alerts
      let expiryCount = 0;
      warranties.forEach((w: any) => {
        const expDate = new Date(w.expiryDate);
        if (w.claimStatus === 'Active' && expDate > today && expDate <= in30Days) {
          expiryCount++;
        }
      });

      if (expiryCount > 0) {
        newAlerts.push({
          id: 'warranty_expiry_summary',
          type: 'info',
          title: 'Warranty Expirations',
          message: `${expiryCount} battery warranties will expire within the next 30 days. Reminders required.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }

      // Active warranty claims
      const pendingClaims = dash.kpis.warrantyClaims;
      if (pendingClaims > 0) {
        newAlerts.push({
          id: 'pending_claims_alert',
          type: 'warning',
          title: 'New Warranty Claims',
          message: `There are ${pendingClaims} warranty claims awaiting review and approval.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }

      // Daily Sales Summary at startup/refresh
      const todaySales = dash.kpis.todaySales;
      if (todaySales > 0) {
        newAlerts.push({
          id: 'daily_sales_summary',
          type: 'success',
          title: 'Daily Sales Status',
          message: `Today's revenue is Rs. ${todaySales.toLocaleString()}. Awesome progress!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        });
      }

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error refreshing notifications:', err);
    }
  }, [token]);

  // Periodically refresh alerts every 1 minute
  useEffect(() => {
    if (token) {
      refreshAlerts();
      const interval = setInterval(refreshAlerts, 60000);
      return () => clearInterval(interval);
    } else {
      setAlerts([]);
    }
  }, [token, refreshAlerts]);

  return (
    <NotificationContext.Provider
      value={{
        alerts,
        toasts,
        addToast,
        removeToast,
        markAlertRead,
        markAllAlertsRead,
        refreshAlerts
      }}
    >
      {children}
      
      {/* Slide-in toast notification portal */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border animate-scale-in text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 ml-auto cursor-pointer"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
