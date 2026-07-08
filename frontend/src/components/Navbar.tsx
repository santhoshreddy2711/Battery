import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  Sun, 
  Moon, 
  GitBranch, 
  Search, 
  User,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  Menu
} from 'lucide-react';

interface NavbarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ collapsed, setCollapsed }) => {
  const { user, activeBranch, setActiveBranch } = useAuth();
  const { alerts, markAlertRead, markAllAlertsRead } = useNotifications();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const branches = ['New Delhi Branch (HQ)', 'Noida Service Center', 'Gurugram Outlet'];
  const unreadAlerts = alerts.filter(a => !a.read);

  // Apply theme to document element and listen for dynamic modifications
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncThemeState = () => {
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      if (storedTheme && storedTheme !== theme) {
        setTheme(storedTheme);
      }
    };
    window.addEventListener('storage', syncThemeState);
    window.addEventListener('theme-changed', syncThemeState);
    return () => {
      window.removeEventListener('storage', syncThemeState);
      window.removeEventListener('theme-changed', syncThemeState);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <ShieldAlert className="text-rose-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <header className="fixed top-0 right-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/60 backdrop-blur-xl transition-all duration-300 left-0">
      <div 
        className={`h-full flex items-center justify-between px-6 transition-all duration-300 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Left Side: Mobile sidebar toggle button & title context */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="relative max-w-xs hidden md:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoices, batteries..."
              className="pl-9 pr-4 py-2 text-xs erp-input rounded-full focus:w-64"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Multi Branch Selector Dropdown */}
          <div className="flex items-center gap-2 border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30 rounded-full px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
            <GitBranch size={14} className="text-red-500" />
            <select
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 pr-1 cursor-pointer font-sans"
            >
              {branches.map(b => (
                <option key={b} value={b} className="dark:bg-slate-900">{b}</option>
              ))}
            </select>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/80 dark:border-slate-800/60 cursor-pointer transition-all duration-200"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications Alerts System */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/80 dark:border-slate-800/60 cursor-pointer transition-all duration-200"
            >
              <Bell size={18} />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-600 text-[10px] text-white font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Notification alert dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                <div className="px-4 py-3.5 border-b border-slate-200/85 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-white">System Notifications</h3>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={markAllAlertsRead}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      No notifications active. Shop operations running smoothly!
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => markAlertRead(alert.id)}
                        className={`p-3.5 flex gap-3 transition-colors duration-150 cursor-pointer ${
                          alert.read ? 'opacity-65 hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'bg-red-50/10 hover:bg-red-50/20 dark:bg-red-950/5 dark:hover:bg-red-950/10'
                        }`}
                      >
                        <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{alert.title}</h4>
                            <span className="text-[9px] text-slate-400">{alert.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-200 cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-display font-bold text-xs uppercase">
                {user ? user.name.substring(0, 2) : <User size={16} />}
              </div>
              {user && (
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none capitalize">{user.role}</p>
                </div>
              )}
            </button>

            {showProfile && user && (
              <div className="absolute right-0 mt-2 w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 uppercase tracking-wider">
                    {user.role} Privilege
                  </span>
                </div>
                <div className="p-1.5">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400">Permissions:</div>
                  <div className="flex flex-wrap gap-1 px-3 pb-3">
                    {user.role === 'admin' ? (
                      <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Full Access</span>
                    ) : (
                      user.permissions.map(p => (
                        <span key={p} className="px-1.5 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded capitalize">{p}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
