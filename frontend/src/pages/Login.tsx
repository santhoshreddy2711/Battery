import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  BatteryCharging, 
  Key, 
  Mail, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Zap,
  Globe,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BatteryCanvas } from '../components/ThreeD/BatteryCanvas';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Landing vs Login state toggle
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }

      login(data.token, data.user);
      addToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setEmail('admin@carbattery.com');
      setPassword('Admin@123');
    } else {
      setEmail('staff@carbattery.com');
      setPassword('Staff@123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900 text-white font-sans overflow-hidden relative">
      
      {/* Background Neon Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-red-800/10 blur-3xl pointer-events-none"></div>

      {/* Left Column: Hero Content or Login Form */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 relative z-10 bg-slate-950/40 backdrop-blur-md border-r border-slate-800/40">
        
        {/* Logo Header */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
            <BatteryCharging size={20} className="animate-pulse" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-wider">
            CAR<span className="text-red-600">BATTERY</span> ERP
          </span>
        </div>

        {/* Center Panel (Toggle Landing / Login) */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">
            {!isLoggingIn ? (
              <motion.div
                key="landing-panel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-500">
                  <Sparkles size={12} /> Next-Gen Enterprise Software
                </div>
                
                <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">
                  Premium ERP for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                    Battery Dealers
                  </span>
                </h1>
                
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Boost your inventory turnarounds, generate GST-compliant bills, track warranties, handle supplier ledger, and forecast sales using advanced AI insights.
                </p>

                {/* Key feature bullets */}
                <div className="space-y-3 pt-2">
                  {[
                    { icon: Zap, text: 'Real-time Stock & Threshold Alerts' },
                    { icon: Globe, text: 'Multi-Branch Inventory & Outlets Control' },
                    { icon: Receipt, text: 'GST Invoice POS with Thermal Print Support' }
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs text-slate-300">
                      <div className="h-6 w-6 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                        <feat.icon size={13} />
                      </div>
                      <span>{feat.text}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setIsLoggingIn(true)}
                    className="btn-primary py-3.5 px-6 font-bold text-sm flex items-center gap-2 group tracking-wide shadow-xl shadow-red-600/15"
                  >
                    Launch ERP Terminal
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-panel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div>
                  <button
                    onClick={() => setIsLoggingIn(false)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors duration-150 mb-3 bg-transparent border-0 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back to info
                  </button>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">
                    ERP Console Login
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Please log in with your authorized employee credentials.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/60 text-red-400 text-xs flex items-center gap-3">
                    <ShieldAlert size={16} className="text-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@carbattery.com"
                        className="pl-11 erp-input bg-slate-900/80 border-slate-800 focus:border-red-500 text-white py-3 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-11 erp-input bg-slate-900/80 border-slate-800 focus:border-red-500 text-white py-3 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 mt-2 font-bold text-sm tracking-wide shadow-lg shadow-red-600/25"
                  >
                    {loading ? 'Accessing Secure Core...' : 'Enter ERP Terminal'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                {/* Presets */}
                <div className="border-t border-slate-800/80 pt-4 mt-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                    Select Demo Account
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fillCredentials('admin')}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-red-500 hover:text-white text-[11px] font-semibold text-slate-400 rounded-xl cursor-pointer transition-all duration-200"
                    >
                      Admin Account
                    </button>
                    <button
                      onClick={() => fillCredentials('staff')}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-red-500 hover:text-white text-[11px] font-semibold text-slate-400 rounded-xl cursor-pointer transition-all duration-200"
                    >
                      Staff Account
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-600 flex justify-between">
          <span>Version 3.1.0-Premium3D</span>
          <span>© 2026 CARBATTERY Shop</span>
        </div>
      </div>

      {/* Right Column: 3D Animated Hero Visual Canvas */}
      <div className="lg:col-span-7 h-[450px] lg:h-screen bg-slate-950 flex flex-col items-center justify-center relative p-8">
        
        {/* Hologram Floating UI overlays */}
        <div className="absolute top-10 right-10 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hidden sm:block pointer-events-none animate-pulse-slow">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">POS Sales Feed Live</span>
          </div>
          <p className="font-display font-extrabold text-sm mt-1 text-slate-200">₹624,900 Today</p>
        </div>

        <div className="absolute bottom-10 left-10 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hidden sm:block pointer-events-none">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Diagnostic Load Test</p>
          <p className="font-display font-bold text-xs mt-1 text-red-500">12.6V Battery Normal</p>
        </div>

        {/* The 3D Canvas */}
        <div className="w-full h-full max-w-xl max-h-[500px]">
          <BatteryCanvas isExpanded={isLoggingIn} />
        </div>
        
      </div>
    </div>
  );
};
