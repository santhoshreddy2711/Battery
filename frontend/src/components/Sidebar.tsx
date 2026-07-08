import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Boxes, 
  Receipt, 
  Users, 
  ShieldCheck, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  FileBarChart2, 
  UsersRound, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BatteryCharging,
  ArrowLeftRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const { user, logout, hasPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, permission: null },
    { id: 'inventory', name: 'Inventory', icon: Boxes, permission: 'inventory' },
    { id: 'billing', name: 'Billing & POS', icon: Receipt, permission: 'billing' },
    { id: 'customers', name: 'Customers CRM', icon: Users, permission: 'customers' },
    { id: 'warranty', name: 'Warranty claims', icon: ShieldCheck, permission: 'customers' },
    { id: 'suppliers', name: 'Suppliers Ledger', icon: Truck, permission: 'inventory' },
    { id: 'purchases', name: 'Purchases stock', icon: ShoppingCart, permission: 'inventory' },
    { id: 'transfers', name: 'Branch Transfers', icon: ArrowLeftRight, permission: 'inventory' },
    { id: 'sales', name: 'Sales dashboard', icon: TrendingUp, permission: 'reports' },
    { id: 'reports', name: 'Reports download', icon: FileBarChart2, permission: 'reports' },
    { id: 'staff', name: 'Staff roles', icon: UsersRound, permission: 'staff' },
    { id: 'settings', name: 'Shop settings', icon: Settings, permission: 'settings' }
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 z-30 h-screen border-r border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center h-10 w-10 min-w-10 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <BatteryCharging size={20} className="animate-pulse-slow" />
          </div>
          {!collapsed && (
            <span className="font-display font-extrabold text-lg leading-tight text-slate-800 dark:text-white tracking-wider whitespace-nowrap">
              CAR<span className="text-red-600">BATTERY</span>
            </span>
          )}
        </div>
        
        {/* Toggle Collapse Arrow Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          // Verify permission gates
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ease-out cursor-pointer hover:translate-x-1 ${
                isActive
                  ? 'bg-red-500 text-white shadow-md shadow-red-600/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={18} className={`transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500'}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        {!collapsed && user && (
          <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-white/50 dark:bg-slate-800/40 shadow-sm border border-slate-100 dark:border-slate-700/40 backdrop-blur-md">
            <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-display font-bold text-sm uppercase">
              {user.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/15 font-semibold text-sm transition-all duration-300 cursor-pointer"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
