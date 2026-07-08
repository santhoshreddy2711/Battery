import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  TrendingUp, 
  RefreshCw, 
  DollarSign, 
  Percent, 
  TrendingDown, 
  Award,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';

interface SalesKPI {
  verifiedRevenue: number;
  monthlySales: number;
  todaySales: number;
  grossProfit: number;
  totalPendingPayments: number;
  totalBatteriesSold: number;
}

interface SalesCharts {
  monthlySales: {
    labels: string[];
    revenue: number[];
    profit: number[];
  };
  revenueGrowth: {
    labels: string[];
    cumulative: number[];
  };
}

export const Sales: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<SalesKPI | null>(null);
  const [charts, setCharts] = useState<SalesCharts | null>(null);

  const fetchSalesDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error loading sales ledger statistics.');
      const data = await res.json();
      setKpis(data.kpis);
      setCharts(data.charts);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesDashboard();
  }, [token]);

  if (loading || !kpis || !charts) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="text-red-600 animate-spin" size={24} />
        <span className="text-xs text-slate-400 font-medium">Assembling profit balance sheets...</span>
      </div>
    );
  }

  // Margin math
  const costOfGoods = kpis.verifiedRevenue - kpis.grossProfit;
  const profitMarginPercent = kpis.verifiedRevenue > 0 
    ? Math.round((kpis.grossProfit / kpis.verifiedRevenue) * 100)
    : 0;

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.08)' } }
    }
  };

  const revenueVsCostData = {
    labels: charts.monthlySales.labels,
    datasets: [
      {
        label: 'Gross Sales (Rs)',
        data: charts.monthlySales.revenue,
        backgroundColor: '#dc2626',
        borderRadius: 4
      },
      {
        label: 'Cost of Stock (COGS)',
        data: charts.monthlySales.revenue.map((val, idx) => val - charts.monthlySales.profit[idx]),
        backgroundColor: '#94a3b8',
        borderRadius: 4
      }
    ]
  };

  const profitMarginTrendData = {
    labels: charts.monthlySales.labels,
    datasets: [
      {
        fill: true,
        label: 'Net Profits (Rs)',
        data: charts.monthlySales.profit,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.03)',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#dc2626'
      }
    ]
  };

  const salesKPIsList = [
    { 
      name: "Today's Intake", 
      value: `₹${kpis.todaySales.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20',
      desc: 'Sales registered today'
    },
    { 
      name: 'Monthly Revenue', 
      value: `₹${kpis.monthlySales.toLocaleString()}`, 
      icon: Calendar, 
      color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20',
      desc: 'Sales this calendar month'
    },
    { 
      name: 'Net Margin Profit', 
      value: `₹${kpis.grossProfit.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
      desc: 'Total sales minus wholesale costs'
    },
    { 
      name: 'Gross Profit Margin', 
      value: `${profitMarginPercent}%`, 
      icon: Percent, 
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20',
      desc: 'Average profit percentage margin'
    }
  ];

  const mockTopSellers = [
    { rank: 1, name: 'Exide Express 100AH', sold: 12, revenue: 69600, margin: '27%' },
    { rank: 2, name: 'Amaron Hi-Life 80AH', sold: 10, revenue: 49000, margin: '28%' },
    { rank: 3, name: 'Exide Milege 60AH', sold: 8, revenue: 30400, margin: '26%' },
    { rank: 4, name: 'Luminous Solar 150AH', sold: 5, revenue: 57500, margin: '26%' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Sales & Profit Analysis</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Analyze product profit margins, evaluate cost of sales, and check leading product rankings.</p>
        </div>
        <button
          onClick={fetchSalesDashboard}
          className="flex items-center justify-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
        >
          <RefreshCw size={14} /> Refresh ledger
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesKPIsList.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="erp-card p-5 flex items-start gap-4"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
              <kpi.icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{kpi.name}</p>
              <h3 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white mt-2 tracking-tight">{kpi.value}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales vs COGS */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Gross Revenue vs Cost of Stock (COGS)</h3>
            <span className="text-[10px] text-slate-400">Past 6 Months</span>
          </div>
          <div className="h-64 relative">
            <Bar data={revenueVsCostData} options={chartOptions} />
          </div>
        </div>

        {/* Profit margins trend */}
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white">Net Profit Timeline (Rs)</h3>
            <span className="text-[10px] text-slate-400">Profit margin path</span>
          </div>
          <div className="h-64 relative">
            <Line data={profitMarginTrendData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Top Sellers Leaderboard */}
      <div className="erp-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="text-amber-500" size={18} />
            Top Selling Batteries Leaderboard
          </h3>
          <span className="px-2.5 py-0.5 text-[10px] bg-red-50 text-red-600 font-bold rounded">
            Best Margins
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th className="erp-th text-center">Rank</th>
                <th className="erp-th">Product Model Name</th>
                <th className="erp-th text-center">Batteries Sold</th>
                <th className="erp-th">Revenue Generated</th>
                <th className="erp-th">Average Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mockTopSellers.map((item) => (
                <tr key={item.rank} className="erp-tr">
                  <td className="erp-td text-center">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs ${
                      item.rank === 1 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        : item.rank === 2
                        ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400'
                    }`}>
                      {item.rank}
                    </span>
                  </td>
                  <td className="erp-td font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="erp-td text-center font-semibold">{item.sold} Units</td>
                  <td className="erp-td font-bold">₹{item.revenue.toLocaleString()}</td>
                  <td className="erp-td">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                      {item.margin} Margin
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
