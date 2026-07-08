import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Billing } from './pages/Billing';
import { Customers } from './pages/Customers';
import { Warranty } from './pages/Warranty';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { Sales } from './pages/Sales';
import { Reports } from './pages/Reports';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';
import { Transfers } from './pages/Transfers';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
        <RefreshCw className="text-red-600 animate-spin" size={32} />
        <span className="text-xs text-slate-500 font-semibold">Initializing CAR Battery ERP...</span>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <Login />;
  }

  // Renders the correct page based on activeTab selection
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'billing':
        return <Billing />;
      case 'customers':
        return <Customers />;
      case 'warranty':
        return <Warranty />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchases':
        return <Purchases />;
      case 'sales':
        return <Sales />;
      case 'reports':
        return <Reports />;
      case 'staff':
        return <Staff />;
      case 'settings':
        return <Settings />;
      case 'transfers':
        return <Transfers />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Navigation Layout */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />
      
      <Navbar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Panel Frame */}
      <main 
        className={`pt-24 px-6 pb-12 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
