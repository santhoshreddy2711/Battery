import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  DollarSign, 
  BookOpen, 
  Users, 
  Layers, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  Truck,
  TrendingUp,
  BrainCircuit,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Coins
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlobeCanvas } from '../components/ThreeD/GlobeCanvas';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface KPIData {
  verifiedRevenue: number;
  orderBook: number;
  clients: number;
  totalProducts: number;
  lowStockAlerts: number;
  monthlySales: number;
  warrantyClaims: number;
  suppliers: number;
  todaySales: number;
  totalBatteriesSold: number;
  grossProfit: number;
}

interface ChartDataGroup {
  monthlySales: {
    labels: string[];
    revenue: number[];
    profit: number[];
  };
  revenueGrowth: {
    labels: string[];
    cumulative: number[];
  };
  batteryBrandSales: {
    labels: string[];
    data: number[];
  };
  inventoryStatus: {
    labels: string[];
    data: number[];
  };
  warrantyClaimsStatus: {
    labels: string[];
    data: number[];
  };
  supplierDues: {
    labels: string[];
    data: number[];
  };
}

interface ForecastData {
  nextMonthSales: number;
  confidence: number;
  insight: string;
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  date: string;
}

export const Dashboard: React.FC = () => {
  const { token, activeBranch } = useAuth();
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [charts, setCharts] = useState<ChartDataGroup | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Branch': activeBranch
        }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard intelligence.');
      const data = await res.json();
      setKpis(data.kpis);
      setCharts(data.charts);
      setForecast(data.forecast);
      setTransactions(data.recentTransactions);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error connecting to reports server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, activeBranch]);

  if (loading || !kpis || !charts) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="text-red-600 animate-spin" size={32} />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assembling executive reports & charts...</p>
      </div>
    );
  }

  // Chart JS Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 10 },
          color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'
        }
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 8,
          font: { size: 9 },
          color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#475569'
        }
      }
    }
  };

  // 1. Monthly Sales Chart (Bar: Sales vs Profit)
  const monthlySalesData = {
    labels: charts.monthlySales.labels,
    datasets: [
      {
        label: 'Gross Sales (Rs)',
        data: charts.monthlySales.revenue,
        backgroundColor: 'rgba(220, 38, 38, 0.85)', // Red accent
        borderRadius: 6
      },
      {
        label: 'Net Profit (Rs)',
        data: charts.monthlySales.profit,
        backgroundColor: 'rgba(244, 63, 94, 0.4)', // Light red
        borderRadius: 6
      }
    ]
  };

  // 2. Revenue Growth (Line)
  const growthData = {
    labels: charts.revenueGrowth.labels,
    datasets: [
      {
        fill: true,
        label: 'Cumulative Revenue (Rs)',
        data: charts.revenueGrowth.cumulative,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#dc2626'
      }
    ]
  };

  // 3. Brand distribution
  const brandData = {
    labels: charts.batteryBrandSales.labels,
    datasets: [
      {
        data: charts.batteryBrandSales.data,
        backgroundColor: [
          '#ef4444', // Red-500
          '#f43f5e', // Rose-500
          '#fb7185', // Rose-400
          '#fda4af', // Rose-300
          '#cbd5e1'  // Slate
        ],
        borderWidth: 0
      }
    ]
  };

  // 4. Inventory status (Doughnut)
  const inventoryStatusData = {
    labels: charts.inventoryStatus.labels,
    datasets: [
      {
        data: charts.inventoryStatus.data,
        backgroundColor: [
          '#dc2626', // Red-600
          '#ef4444', // Red-500
          '#f87171', // Red-400
          '#fca5a5', // Red-300
          '#e2e8f0'  // Slate
        ],
        borderWidth: 0
      }
    ]
  };

  // 5. Warranty Claims status (Doughnut)
  const warrantyClaimsStatusData = {
    labels: charts.warrantyClaimsStatus.labels,
    datasets: [
      {
        data: charts.warrantyClaimsStatus.data,
        backgroundColor: [
          '#10b981', // Emerald-500 (Active)
          '#3b82f6', // Blue-500 (Claimed)
          '#64748b'  // Slate-500 (Expired)
        ],
        borderWidth: 0
      }
    ]
  };

  // 6. Supplier Dues (Bar)
  const supplierDuesData = {
    labels: charts.supplierDues.labels,
    datasets: [
      {
        label: 'Outstanding Dues (Rs)',
        data: charts.supplierDues.data,
        backgroundColor: 'rgba(220, 38, 38, 0.85)',
        borderRadius: 6
      }
    ]
  };

  const kpiCardItems = [
    { 
      title: 'Verified Revenue', 
      value: `₹${kpis.verifiedRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
      desc: 'Overall checkout value'
    },
    { 
      title: 'Order Book', 
      value: kpis.orderBook, 
      icon: BookOpen, 
      color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20',
      desc: 'Total bills processed'
    },
    { 
      title: 'Clients', 
      value: kpis.clients, 
      icon: Users, 
      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20',
      desc: 'Active customer database'
    },
    { 
      title: 'Total Products', 
      value: kpis.totalProducts, 
      icon: Layers, 
      color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/20',
      desc: 'Distinct battery models'
    },
    { 
      title: 'Low Stock Alerts', 
      value: kpis.lowStockAlerts, 
      icon: AlertTriangle, 
      color: kpis.lowStockAlerts > 0 ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20' : 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/40',
      desc: 'Critical stock levels (<=5)',
      alert: kpis.lowStockAlerts > 0
    },
    { 
      title: 'Monthly Sales', 
      value: `₹${kpis.monthlySales.toLocaleString()}`, 
      icon: Calendar, 
      color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/20',
      desc: 'Revenue this month'
    },
    { 
      title: 'Warranty Claims', 
      value: kpis.warrantyClaims, 
      icon: ShieldAlert, 
      color: kpis.warrantyClaims > 0 ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20' : 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/40',
      desc: 'Pending replacement requests'
    },
    { 
      title: 'Suppliers', 
      value: kpis.suppliers, 
      icon: Truck, 
      color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20',
      desc: 'Registered wholesalers'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">ERP Executive Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Real-time battery shop analytics, sales summaries, and forecasting.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center justify-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
        >
          <RefreshCw size={14} />
          Refresh Stats
        </button>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCardItems.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`erp-card p-5 flex items-start gap-4 relative overflow-hidden ${
              kpi.alert ? 'border-red-300 dark:border-red-900/60 kpi-red-glow' : ''
            }`}
          >
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${kpi.color}`}>
              <kpi.icon size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">{kpi.title}</p>
              <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-2 tracking-tight">{kpi.value}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{kpi.desc}</p>
            </div>
            
            {kpi.alert && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 animate-ping"></span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Secondary Dashboard Cards (Today's performance & Globe & AI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Summary */}
        <div className="erp-card p-5 bg-gradient-to-br from-red-600 to-red-800 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Daily Summary</span>
              <h2 className="font-display font-extrabold text-3xl mt-1 tracking-tight">₹{kpis.todaySales.toLocaleString()}</h2>
              <p className="text-xs opacity-90 mt-2">Recorded revenue for today across active branch operations.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/10 text-center">
              <div>
                <span className="text-[9px] block opacity-75 leading-none mb-1">Sold Qty</span>
                <span className="font-display font-bold text-sm">{kpis.totalBatteriesSold} units</span>
              </div>
              <div className="border-x border-white/10">
                <span className="text-[9px] block opacity-75 leading-none mb-1">Gross Profit</span>
                <span className="font-display font-bold text-sm">₹{kpis.grossProfit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] block opacity-75 leading-none mb-1">Claims Res</span>
                <span className="font-display font-bold text-sm">94%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Sales Globe */}
        <div className="erp-card p-5 bg-slate-900 border-slate-800 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="flex items-center justify-between z-10">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-red-500">Global Sales Analytics</span>
              <h3 className="font-display font-bold text-xs mt-0.5 text-slate-200">Live Multi-Branch Network</h3>
            </div>
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
          </div>
          
          {/* Visual 3D Globe representation */}
          <div className="absolute inset-0 pt-11 pb-2 px-1 flex items-center justify-center">
            <GlobeCanvas />
          </div>

          <div className="z-10 mt-auto text-[9px] text-slate-400 flex justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 backdrop-blur-md">
            <span>Branch Nodes: Active</span>
            <span>Signals: Secure</span>
          </div>
        </div>

        {/* AI Forecasting Module */}
        {forecast && (
          <div className="erp-card p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="text-red-600 dark:text-red-400 animate-pulse" size={20} />
              <span className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">AI Sales Forecasting</span>
              <span className="ml-auto px-2 py-0.5 text-[9px] bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 font-bold rounded">Active</span>
            </div>
            
            <div className="space-y-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">Estimated Next Month Sales:</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">₹{forecast.nextMonthSales.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                  +{forecast.confidence}% conf
                </span>
              </div>
              <div className="p-3.5 bg-red-50/40 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/25 rounded-xl mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{forecast.insight}"
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-[10px] text-slate-400 justify-between">
              <span>Model: Linear regression (seasonal)</span>
              <span>Updated: Real-time</span>
            </div>
          </div>
        )}
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales (Bar Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Monthly Sales vs Profit</h3>
            <span className="text-[10px] text-slate-400">Past 6 Months</span>
          </div>
          <div className="h-64 relative">
            <Bar data={monthlySalesData} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Growth (Line Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Revenue Growth Trend</h3>
            <span className="text-[10px] text-slate-400">Cumulative</span>
          </div>
          <div className="h-64 relative">
            <Line data={growthData} options={chartOptions} />
          </div>
        </div>

        {/* Battery Brand distribution (Pie Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Battery Brand Distribution</h3>
            <span className="text-[10px] text-slate-400">Sales volume share</span>
          </div>
          <div className="h-64 relative">
            <Pie data={brandData} options={chartOptions} />
          </div>
        </div>

        {/* Inventory Status (Doughnut Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Inventory by Vehicle Type</h3>
            <span className="text-[10px] text-slate-400">In stock units</span>
          </div>
          <div className="h-64 relative">
            <Doughnut data={inventoryStatusData} options={donutOptions as any} />
          </div>
        </div>

        {/* Warranty Claims (Doughnut Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Warranty Coverage Status</h3>
            <span className="text-[10px] text-slate-400">Claims distribution</span>
          </div>
          <div className="h-64 relative">
            <Doughnut data={warrantyClaimsStatusData} options={donutOptions as any} />
          </div>
        </div>

        {/* Supplier Performance Dues (Bar Chart) */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Outstanding Supplier Dues</h3>
            <span className="text-[10px] text-slate-400">Pending Ledger Balances</span>
          </div>
          <div className="h-64 relative">
            <Bar data={supplierDuesData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Area: Recent Invoices & Logs */}
      <div className="erp-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Recent Shop Transactions</h3>
          <span className="px-2.5 py-0.5 text-[10px] bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 font-bold rounded">
            Live Feed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th className="erp-th">Invoice Number</th>
                <th className="erp-th">Date</th>
                <th className="erp-th">Customer Name</th>
                <th className="erp-th">Total Paid</th>
                <th className="erp-th">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="erp-tr">
                  <td className="erp-td font-semibold text-red-600 dark:text-red-400">{tx.invoiceNumber}</td>
                  <td className="erp-td">{tx.date}</td>
                  <td className="erp-td font-medium text-slate-800 dark:text-slate-200">{tx.customerName}</td>
                  <td className="erp-td">₹{tx.totalAmount.toLocaleString()}</td>
                  <td className="erp-td">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.paymentMethod === 'UPI' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : tx.paymentMethod === 'Card'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                        : tx.paymentMethod === 'Cash'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                    }`}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
