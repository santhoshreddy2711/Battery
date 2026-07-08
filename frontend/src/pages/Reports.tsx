import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Calendar, 
  FileSpreadsheet, 
  FileCode,
  Table
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

export const Reports: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'gst' | 'customers' | 'warranties' | 'suppliers'>('sales');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Raw data fetched from backend
  const [reportData, setReportData] = useState<any>({
    sales: [],
    inventory: [],
    gst: [],
    customers: [],
    warranties: [],
    suppliers: []
  });

  const fetchReportsData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load reporting data.');
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [token]);

  // Filters data based on date ranges (if applicable)
  const getFilteredData = () => {
    const currentDataset = reportData[reportType] || [];
    if (!fromDate && !toDate) return currentDataset;

    return currentDataset.filter((row: any) => {
      // Find a date property in the row
      const dateProp = row['Date'] || row['Purchase Date'] || row['Purchase Date'];
      if (!dateProp) return true; // Can't filter if no date present

      const rowTime = new Date(dateProp).getTime();
      const startLimit = fromDate ? new Date(fromDate).getTime() : 0;
      // Set toDate to end of day to be inclusive
      const endLimit = toDate ? new Date(toDate + 'T23:59:59').getTime() : Infinity;

      return rowTime >= startLimit && rowTime <= endLimit;
    });
  };

  const filteredDataset = getFilteredData();

  // Export 1: CSV Generation
  const handleExportCSV = () => {
    if (!filteredDataset.length) {
      addToast('No data available to export.', 'warning');
      return;
    }

    const headers = Object.keys(filteredDataset[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...filteredDataset.map((row: any) => 
        headers.map(h => {
          const val = row[h] === null || row[h] === undefined ? '' : row[h];
          // Escape commas
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('CSV Report downloaded successfully.', 'success');
  };

  // Export 2: Excel Generation using SheetJS
  const handleExportExcel = () => {
    if (!filteredDataset.length) {
      addToast('No data available to export.', 'warning');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredDataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Sheet");
    
    // Buffer download
    XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('Excel Spreadsheet exported successfully.', 'success');
  };

  // Export 3: PDF Tabular Report
  const handleExportPDF = () => {
    if (!filteredDataset.length) {
      addToast('No data available to export.', 'warning');
      return;
    }

    const doc = new jsPDF();
    const columns = Object.keys(filteredDataset[0]);
    const body = filteredDataset.map((row: any) => columns.map(col => row[col]));

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38);
    doc.text(`${reportType.toUpperCase()} REPORT LEDGER`, 14, 20);
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);
    if (fromDate || toDate) {
      doc.text(`Filter Range: ${fromDate || 'Beginning'} to ${toDate || 'Today'}`, 14, 31);
    }

    (doc as any).autoTable({
      head: [columns],
      body: body,
      startY: 36,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 }
    });

    doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('PDF Report exported successfully.', 'success');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Business Reports & Exports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Run auditing operations, compile ledger details, and download CSV/Excel/PDF sheets.</p>
        </div>
        <button
          onClick={fetchReportsData}
          className="flex items-center justify-center gap-2 btn-secondary py-2 text-xs cursor-pointer bg-white"
        >
          <RefreshCw size={14} /> Refresh Registry
        </button>
      </div>

      {/* Selector Filters Header */}
      <div className="erp-card p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Report selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="erp-input py-2 text-xs"
          >
            <option value="sales">Sales History Report</option>
            <option value="inventory">Inventory Asset Valuation</option>
            <option value="gst">GST Tax Audit Sheet</option>
            <option value="customers">Customer loyalty & CRM</option>
            <option value="warranties">Warranty Claim Registrations</option>
            <option value="suppliers">Supplier Outstandings Ledger</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Calendar size={13} /> From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="erp-input py-2 text-xs"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Calendar size={13} /> To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="erp-input py-2 text-xs"
          />
        </div>

        {/* Clear Filters */}
        <div>
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="w-full btn-secondary py-2 text-xs font-semibold cursor-pointer text-slate-500"
          >
            Reset Dates
          </button>
        </div>
      </div>

      {/* Downloader buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Excel Button */}
        <button
          onClick={handleExportExcel}
          disabled={loading || filteredDataset.length === 0}
          className="p-5 erp-card flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 cursor-pointer disabled:opacity-50 text-left transition-all duration-200"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Export to Excel</h4>
            <p className="text-[10px] text-slate-500 mt-1">Download SheetJS spreadsheet</p>
          </div>
        </button>

        {/* PDF Button */}
        <button
          onClick={handleExportPDF}
          disabled={loading || filteredDataset.length === 0}
          className="p-5 erp-card flex items-center gap-4 bg-rose-50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/60 hover:border-rose-500 cursor-pointer disabled:opacity-50 text-left transition-all duration-200"
        >
          <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Export as PDF</h4>
            <p className="text-[10px] text-slate-500 mt-1">Create tabular printing sheet</p>
          </div>
        </button>

        {/* CSV Button */}
        <button
          onClick={handleExportCSV}
          disabled={loading || filteredDataset.length === 0}
          className="p-5 erp-card flex items-center gap-4 bg-sky-50 dark:bg-sky-950/15 border-sky-200 dark:border-sky-900/60 hover:border-sky-505 cursor-pointer disabled:opacity-50 text-left transition-all duration-200"
        >
          <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
            <FileCode size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Export to CSV</h4>
            <p className="text-[10px] text-slate-500 mt-1">Export comma delimited raw text</p>
          </div>
        </button>

      </div>

      {/* Main Table Preview */}
      <div className="erp-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Table size={16} className="text-red-600" />
          <h3 className="font-display font-bold text-sm">Auditing preview (Rows: {filteredDataset.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="text-red-600 animate-spin mx-auto mb-2" size={24} />
            <span className="text-xs text-slate-400">Loading audit records...</span>
          </div>
        ) : filteredDataset.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No records matched date ranges.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  {Object.keys(filteredDataset[0]).map((header, idx) => (
                    <th key={idx} className="erp-th">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDataset.slice(0, 10).map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="erp-tr">
                    {Object.keys(row).map((col, cIdx) => (
                      <td key={cIdx} className="erp-td truncate max-w-[150px]">{String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredDataset.length > 10 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-850">
                Displaying first 10 rows for preview. Run exports above to download complete datasets.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
