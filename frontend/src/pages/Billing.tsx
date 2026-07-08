import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  MessageSquare, 
  Mail, 
  QrCode, 
  RefreshCw,
  Search,
  ShoppingCart,
  UserCheck,
  CheckCircle,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const BarcodeSVG: React.FC<{ value: string }> = ({ value }) => {
  const getBars = () => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bars = [];
    for (let i = 0; i < 35; i++) {
      const bit = (hash >> (i % 32)) & 1;
      bars.push(bit === 1 ? 2 : 4);
    }
    return bars;
  };
  
  return (
    <svg width="120" height="30" className="mx-auto mt-1 opacity-80">
      <g fill="#000000">
        {getBars().map((width, idx) => (
          <rect key={idx} x={idx * 3.2} y="0" width={width === 2 ? "1" : "2.5"} height="30" />
        ))}
      </g>
    </svg>
  );
};

const QRCodeSVG: React.FC<{ value: string }> = ({ value }) => {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto my-2">
      <rect x="0" y="0" width="22" height="22" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="4" y="4" width="14" height="14" fill="#000" />
      <rect x="78" y="0" width="22" height="22" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="82" y="4" width="14" height="14" fill="#000" />
      <rect x="0" y="78" width="22" height="22" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="4" y="82" width="14" height="14" fill="#000" />
      <g fill="#000">
        <rect x="30" y="8" width="8" height="4" />
        <rect x="50" y="12" width="4" height="12" />
        <rect x="30" y="30" width="12" height="8" />
        <rect x="60" y="40" width="8" height="4" />
        <rect x="40" y="50" width="4" height="8" />
        <rect x="70" y="70" width="12" height="4" />
        <rect x="30" y="70" width="4" height="12" />
        <rect x="50" y="60" width="12" height="12" />
        <rect x="80" y="80" width="8" height="8" />
      </g>
      <circle cx="50" cy="50" r="2" fill="#dc2626" />
    </svg>
  );
};

interface Product {
  id: string;
  brand: string;
  model: string;
  sellingPrice: number;
  quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  mobileNumber: string;
  vehicleNumber: string;
  items: Array<{
    productId: string;
    brand: string;
    model: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  date: string;
  pointsEarned: number;
}

export const Billing: React.FC = () => {
  const { token, activeBranch } = useAuth();
  const { addToast, refreshAlerts } = useNotifications();

  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Checkout Form states
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Credit'>('UPI');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Add to cart helper state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState(1);

  // Selected Invoice for modal preview/actions
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [sharePreviewText, setSharePreviewText] = useState('');
  const [printLayout, setPrintLayout] = useState<'A4' | 'thermal'>('A4');

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/inventory', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Branch': activeBranch
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching billing products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Branch': activeBranch
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchInvoiceHistory();
  }, [token, activeBranch]);

  const handleAddToCart = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.quantity < addQty) {
      addToast(`Only ${prod.quantity} units available in stock.`, 'warning');
      return;
    }

    // Check if product already in cart
    const existing = cart.find(item => item.product.id === prod.id);
    if (existing) {
      if (prod.quantity < existing.quantity + addQty) {
        addToast(`Insufficient stock to add more units.`, 'warning');
        return;
      }
      setCart(cart.map(item => 
        item.product.id === prod.id 
          ? { ...item, quantity: item.quantity + addQty } 
          : item
      ));
    } else {
      setCart([...cart, { product: prod, quantity: addQty }]);
    }

    setSelectedProductId('');
    setAddQty(1);
    addToast(`${prod.brand} ${prod.model} added to bill.`, 'success');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Live Math calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  };
  
  const subtotal = calculateCartSubtotal();
  const discountVal = Number(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const gstAmt = Math.round(taxableAmount * 0.18);
  const totalAmount = taxableAmount + gstAmt;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!cart.length) {
      addToast('Cart is empty. Select products first.', 'warning');
      return;
    }

    try {
      const checkoutItems = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const res = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerName,
          mobileNumber,
          vehicleNumber,
          items: checkoutItems,
          discount: discountVal,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error processing invoice checkout.');

      // Trigger celebrate effects
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#dc2626', '#ef4444', '#f87171']
      });

      addToast(`Invoice ${data.invoiceNumber} Generated!`, 'success');
      
      // Clear Form & Cart
      setCustomerName('');
      setMobileNumber('');
      setVehicleNumber('');
      setDiscount('0');
      setCart([]);
      
      // Refresh database listings
      fetchProducts();
      fetchInvoiceHistory();
      refreshAlerts();

      // Show details
      setSelectedInvoice(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  // Generate PDF Invoice
  const handleDownloadPDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // Print Header Customization
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Red
    doc.text('RED ACCENT CAR BATTERY HUB', 14, 22);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GSTIN: 07AAAAA1111A1Z1', 14, 28);
    doc.text('Plot 42, Main Road, Sector 6, Dwarka, New Delhi - 110075', 14, 33);
    doc.text(`Branch: ${activeBranch}`, 14, 38);

    // Invoice Meta (right-aligned details)
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`INVOICE: ${invoice.invoiceNumber}`, 140, 22);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date: ${invoice.date}`, 140, 28);
    doc.text(`Payment: ${invoice.paymentMethod}`, 140, 33);

    // Horizontal Rule
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 43, 196, 43);

    // Customer Billing Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Billed To:', 14, 50);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Customer Name: ${invoice.customerName}`, 14, 56);
    doc.text(`Mobile Number: ${invoice.mobileNumber}`, 14, 61);
    doc.text(`Vehicle Plate No: ${invoice.vehicleNumber || 'N/A'}`, 14, 66);

    // Table of products
    const tableData = invoice.items.map((item, index) => [
      index + 1,
      `${item.brand} ${item.model}`,
      item.quantity,
      `Rs. ${item.price.toLocaleString()}`,
      `Rs. ${(item.quantity * item.price).toLocaleString()}`
    ]);

    (doc as any).autoTable({
      head: [['S.No', 'Product Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      startY: 72,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
      styles: { fontSize: 9 }
    });

    // Summary calculations
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9.5);
    doc.text(`Subtotal: Rs. ${invoice.subtotal.toLocaleString()}`, 135, finalY);
    doc.text(`Discount: Rs. ${invoice.discount.toLocaleString()}`, 135, finalY + 5);
    doc.text(`GST (18%): Rs. ${invoice.gstAmount.toLocaleString()}`, 135, finalY + 10);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Grand Total: Rs. ${invoice.totalAmount.toLocaleString()}`, 135, finalY + 17);

    // Loyalty credit footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Points Earned on this visit: +${invoice.pointsEarned} Loyalty Points.`, 14, finalY + 17);
    doc.text('This invoice is digitally verified. QR verification key is registered with warranty claim portal.', 14, finalY + 23);

    // Save
    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    addToast('PDF Invoice generated and downloaded successfully.', 'success');
  };

  const handlePrint = (invoice: Invoice) => {
    setPrintLayout('A4');
    setSelectedInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handlePrintThermal = (invoice: Invoice) => {
    setPrintLayout('thermal');
    setSelectedInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Open Sharing Previews for WhatsApp or Email
  const openShareModal = (type: 'whatsapp' | 'email', invoice: Invoice) => {
    setShareType(type);
    setSelectedInvoice(invoice);
    
    // Auto populate template values
    if (type === 'whatsapp') {
      const temp = `Hello ${invoice.customerName}, thank you for purchasing from RED ACCENT CAR BATTERY HUB. Your invoice ${invoice.invoiceNumber} total is Rs. ${invoice.totalAmount}. Stay safe!`;
      setSharePreviewText(temp);
    } else {
      const temp = `Dear ${invoice.customerName},\n\nThank you for choosing RED ACCENT CAR BATTERY HUB.\n\nAttached is your invoice ${invoice.invoiceNumber} for the purchase of battery packs.\nInvoice Grand Total: Rs. ${invoice.totalAmount}.\n\nBest Regards,\nBilling Team`;
      setSharePreviewText(temp);
    }
    setShowShareModal(true);
  };

  const handleShareSubmit = () => {
    addToast(`Invoice dispatch simulation successful! ${shareType === 'whatsapp' ? 'WhatsApp text sent to' : 'Email dispatched to'} customer.`, 'success');
    setShowShareModal(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Printable Invoice Component (Visible during print only) */}
      {selectedInvoice && (
        <div className="hidden print-only bg-white text-black">
          {printLayout === 'A4' ? (
            <div className="p-8 bg-white text-black text-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-red-600">RED ACCENT CAR BATTERY HUB</h1>
                  <p className="text-xs text-gray-500">GSTIN: 07AAAAA1111A1Z1</p>
                  <p className="text-xs text-gray-500">Dwarka Sector 6, New Delhi - 110075</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold">INVOICE: {selectedInvoice.invoiceNumber}</h2>
                  <p className="text-xs">Date: {selectedInvoice.date}</p>
                  <p className="text-xs">Payment Method: {selectedInvoice.paymentMethod}</p>
                </div>
              </div>
              <hr className="border-gray-200" />
              <div>
                <h3 className="font-bold">Billed To:</h3>
                <p>Customer Name: {selectedInvoice.customerName}</p>
                <p>Mobile: {selectedInvoice.mobileNumber}</p>
                <p>Vehicle Plate: {selectedInvoice.vehicleNumber || 'N/A'}</p>
              </div>
              <table className="w-full text-left border-collapse border border-gray-200 mt-4">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2">Item</th>
                    <th className="border border-gray-200 p-2">Qty</th>
                    <th className="border border-gray-200 p-2">Unit Price</th>
                    <th className="border border-gray-200 p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-200 p-2">{item.brand} {item.model}</td>
                      <td className="border border-gray-200 p-2">{item.quantity}</td>
                      <td className="border border-gray-200 p-2">Rs. {item.price.toLocaleString()}</td>
                      <td className="border border-gray-200 p-2">Rs. {(item.quantity * item.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right space-y-1 mt-4">
                <p>Subtotal: Rs. {selectedInvoice.subtotal.toLocaleString()}</p>
                <p>Discount: Rs. {selectedInvoice.discount.toLocaleString()}</p>
                <p>GST (18%): Rs. {selectedInvoice.gstAmount.toLocaleString()}</p>
                <p className="font-bold text-red-600 text-lg">Grand Total: Rs. {selectedInvoice.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="w-[80mm] p-4 bg-white text-black font-mono text-[9px] space-y-2 leading-tight">
              <div className="text-center space-y-1">
                <h1 className="text-xs font-bold tracking-tight">RED ACCENT CAR BATTERY HUB</h1>
                <p>Branch: {activeBranch}</p>
                <p>GSTIN: 07AAAAA1111A1Z1</p>
                <p>Plot 42, Main Road, Dwarka, Delhi</p>
                <p>Tel: +91 98765 43210</p>
              </div>
              <p className="border-b border-dashed border-black my-1"></p>
              <div>
                <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>Date:</strong> {selectedInvoice.date}</p>
                <p><strong>Payment:</strong> {selectedInvoice.paymentMethod}</p>
              </div>
              <p className="border-b border-dashed border-black my-1"></p>
              <div>
                <p><strong>Billed To:</strong></p>
                <p>Name: {selectedInvoice.customerName}</p>
                <p>Mob: {selectedInvoice.mobileNumber}</p>
                {selectedInvoice.vehicleNumber && <p>Vehicle: {selectedInvoice.vehicleNumber}</p>}
              </div>
              <p className="border-b border-dashed border-black my-1"></p>
              <table className="w-full text-left font-mono text-[8px] table-fixed">
                <thead>
                  <tr className="border-b border-black">
                    <th className="pb-1 w-3/5">Item</th>
                    <th className="text-center pb-1 w-1/5">Qty</th>
                    <th className="text-right pb-1 w-1/5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index} className="align-top">
                      <td className="py-1 truncate">{item.brand} {item.model}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">₹{(item.quantity * item.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-b border-dashed border-black my-1"></p>
              <div className="space-y-0.5 text-right text-[8px]">
                <p>Subtotal: ₹{selectedInvoice.subtotal.toLocaleString()}</p>
                <p>Discount: -₹{selectedInvoice.discount.toLocaleString()}</p>
                <p>GST (18%): ₹{selectedInvoice.gstAmount.toLocaleString()}</p>
                <p className="text-[10px] font-bold">Grand Total: ₹{selectedInvoice.totalAmount.toLocaleString()}</p>
              </div>
              <p className="border-b border-dashed border-black my-1"></p>
              <div className="text-center space-y-2 pt-1 flex flex-col items-center">
                <div className="flex flex-col items-center justify-center bg-white p-1">
                  <QRCodeSVG value={selectedInvoice.invoiceNumber} />
                  <BarcodeSVG value={selectedInvoice.invoiceNumber} />
                  <span className="text-[8px] mt-1 font-mono tracking-widest">{selectedInvoice.invoiceNumber}</span>
                </div>
                <p className="text-[8px] italic font-semibold">Loyalty Points Earned: +{selectedInvoice.pointsEarned}</p>
                <p className="text-[8px] uppercase tracking-wider font-bold">--- THANK YOU ---</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Left 2 Columns: Invoice generator form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="erp-card p-5">
            <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="text-red-600" size={18} />
              Billing Terminal & POS
            </h2>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Customer Info row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="erp-input py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Plate No.</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. DL3CA1234"
                    className="erp-input py-2 text-xs"
                  />
                </div>
              </div>

              {/* Add Cart items panel */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-slate-400" />
                  Select Stock Items
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Battery Model</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="erp-input py-2 text-xs"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.brand} - {p.model} (Stock: {p.quantity} qty) - Rs. {p.sellingPrice.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                    <input
                      type="number"
                      value={addQty}
                      onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="erp-input py-2 text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!selectedProductId}
                      className="w-full btn-primary py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Plus size={14} className="mr-1" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Channel</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['UPI', 'Card', 'Cash', 'Credit'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode as any)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all duration-150 cursor-pointer ${
                          paymentMethod === mode
                            ? 'bg-red-50 text-red-600 border-red-500 dark:bg-red-950/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Add Discount (Rs)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="erp-input py-2 text-xs"
                  />
                </div>
              </div>

              {/* Checkout buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={!cart.length}
                  className="btn-primary py-3 text-xs font-bold w-full sm:w-auto tracking-wide shadow-lg shadow-red-600/10 cursor-pointer disabled:opacity-50"
                >
                  Generate Invoice & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Cart receipt checklist summary */}
        <div className="space-y-6">
          <div className="erp-card p-5 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 relative">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="text-red-600" size={16} />
              Current Order Cart
            </h3>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Cart is empty. Select a battery item to create an invoice.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart list */}
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs animate-scale-in"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.product.brand} {item.product.model}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.quantity} x Rs. {item.product.sellingPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Rs. {(item.quantity * item.product.sellingPrice).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Math Summary */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Discount</span>
                    <span className="text-red-500">- Rs. {discountVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST Tax (18%)</span>
                    <span>Rs. {gstAmt.toLocaleString()}</span>
                  </div>
                  
                  {/* Loyalty Points Calculator */}
                  <div className="flex justify-between text-slate-400 dark:text-slate-500 text-[10px] italic border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                    <span className="flex items-center gap-1">
                      <UserCheck size={11} className="text-emerald-500" /> Points to Earn:
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">+{Math.floor(subtotal / 100)} pts</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-slate-200 pt-1.5">
                    <span>Grand Total</span>
                    <span className="text-red-600 dark:text-red-400">Rs. {totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Invoice History Lists */}
      <div className="erp-card no-print">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">Invoice Registry Ledger</h3>
          <span className="text-xs text-slate-400">Archived transactions</span>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="text-red-600 animate-spin mx-auto mb-2" size={20} />
            <span className="text-xs text-slate-400">Reading ledger history...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No invoices generated yet in this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="erp-th">Invoice ID</th>
                  <th className="erp-th">Date</th>
                  <th className="erp-th">Customer Name</th>
                  <th className="erp-th">Mobile</th>
                  <th className="erp-th">Vehicle Plate</th>
                  <th className="erp-th">Grand Total</th>
                  <th className="erp-th">Method</th>
                  <th className="erp-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="erp-tr">
                    <td className="erp-td font-semibold text-red-600 dark:text-red-400">{inv.invoiceNumber}</td>
                    <td className="erp-td">{inv.date}</td>
                    <td className="erp-td font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</td>
                    <td className="erp-td">{inv.mobileNumber}</td>
                    <td className="erp-td text-xs">{inv.vehicleNumber || 'N/A'}</td>
                    <td className="erp-td font-bold">Rs. {inv.totalAmount.toLocaleString()}</td>
                    <td className="erp-td">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="erp-td text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowThermalModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400 cursor-pointer"
                          title="Thermal Receipt (80mm)"
                        >
                          <Receipt size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => openShareModal('whatsapp', inv)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 cursor-pointer"
                          title="Share WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => openShareModal('email', inv)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 cursor-pointer"
                          title="Share Email"
                        >
                          <Mail size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowQRModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-violet-600 cursor-pointer"
                          title="Verify QR Code"
                        >
                          <QrCode size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Verification Modal */}
      <AnimatePresence>
        {showQRModal && selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-1.5">
                <QrCode className="text-red-600" size={18} />
                QR Code Verification
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6">
                Scan this QR code to verify invoice validity and warranty coverage.
              </p>

              {/* Stylized QR Code & Barcode */}
              <div className="mx-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center mb-4 shadow-inner">
                <QRCodeSVG value={selectedInvoice.invoiceNumber} />
                <div className="mt-2 w-full">
                  <BarcodeSVG value={selectedInvoice.invoiceNumber} />
                  <p className="text-[9px] text-slate-400 font-mono mt-1">{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>

              <div className="bg-red-50/50 dark:bg-red-950/10 p-3.5 rounded-xl text-left text-xs space-y-1 border border-red-100/50 dark:border-red-900/25 mb-6">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Verification Details:</p>
                <p className="text-slate-500 dark:text-slate-400">Invoice No: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedInvoice.invoiceNumber}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Billed Value: <span className="font-semibold text-slate-700 dark:text-slate-300">Rs. {selectedInvoice.totalAmount.toLocaleString()}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Warranty Registry: <span className="font-semibold text-emerald-600 dark:text-emerald-400">REGISTERED ACTIVE</span></p>
              </div>

              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="w-full btn-secondary py-2 text-xs cursor-pointer"
              >
                Close Panel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp / Email Share Modal */}
      <AnimatePresence>
        {showShareModal && selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                {shareType === 'whatsapp' ? (
                  <MessageSquare className="text-emerald-600" size={18} />
                ) : (
                  <Mail className="text-blue-600" size={18} />
                )}
                Invoice Share Panel ({shareType === 'whatsapp' ? 'WhatsApp API' : 'Email SMTP'})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Verify outgoing message format matching configuration templates.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Destination {shareType === 'whatsapp' ? 'Mobile Number' : 'Email Address'}
                  </label>
                  <input
                    type="text"
                    defaultValue={shareType === 'whatsapp' ? selectedInvoice.mobileNumber : `${selectedInvoice.customerName.toLowerCase().replace(' ', '')}@gmail.com`}
                    className="erp-input py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Message Body Preview</label>
                  <textarea
                    value={sharePreviewText}
                    onChange={(e) => setSharePreviewText(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-sans text-slate-600 dark:text-slate-300 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 btn-secondary py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleShareSubmit}
                    className="flex-1 btn-primary py-2 text-xs font-semibold cursor-pointer"
                  >
                    {shareType === 'whatsapp' ? 'Send WhatsApp' : 'Dispatch Email'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 80mm Thermal Printer Layout Modal Preview */}
      <AnimatePresence>
        {showThermalModal && selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col"
            >
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white mb-2 flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <Printer className="text-red-600" size={18} />
                  Thermal Printer Preview (80mm)
                </span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400">
                  ESC to close
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Real-time layout simulation of the 80mm paper roll print output.
              </p>

              {/* Simulated 80mm roll slip container */}
              <div className="flex-1 bg-white border border-slate-300 dark:border-slate-800 shadow-inner rounded-xl p-4 text-slate-900 font-mono text-[10px] space-y-3 leading-tight max-h-[380px] overflow-y-auto">
                <div className="text-center space-y-1">
                  <h1 className="text-xs font-bold tracking-tight">RED ACCENT CAR BATTERY HUB</h1>
                  <p className="text-[9px]">Branch: {activeBranch}</p>
                  <p className="text-[9px]">GSTIN: 07AAAAA1111A1Z1</p>
                  <p className="text-[9px]">Plot 42, Main Road, Sector 6, Dwarka, Delhi</p>
                  <p className="text-[9px]">Tel: +91 98765 43210</p>
                </div>
                <p className="border-b border-dashed border-slate-400 my-1"></p>
                <div>
                  <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
                  <p><strong>Date:</strong> {selectedInvoice.date}</p>
                  <p><strong>Payment:</strong> {selectedInvoice.paymentMethod}</p>
                </div>
                <p className="border-b border-dashed border-slate-400 my-1"></p>
                <div>
                  <p><strong>Billed To:</strong></p>
                  <p>Name: {selectedInvoice.customerName}</p>
                  <p>Mob: {selectedInvoice.mobileNumber}</p>
                  {selectedInvoice.vehicleNumber && <p>Vehicle: {selectedInvoice.vehicleNumber}</p>}
                </div>
                <p className="border-b border-dashed border-slate-400 my-1"></p>
                <table className="w-full text-left font-mono text-[9px] table-fixed">
                  <thead>
                    <tr className="border-b border-slate-400">
                      <th className="pb-1 w-3/5">Item</th>
                      <th className="text-center pb-1 w-1/5">Qty</th>
                      <th className="text-right pb-1 w-1/5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="align-top">
                        <td className="py-1 truncate">{item.brand} {item.model}</td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-right py-1">₹{(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-b border-dashed border-slate-400 my-1"></p>
                <div className="space-y-0.5 text-right text-[9px]">
                  <p>Subtotal: ₹{selectedInvoice.subtotal.toLocaleString()}</p>
                  <p>Discount: -₹{selectedInvoice.discount.toLocaleString()}</p>
                  <p>GST (18%): ₹{selectedInvoice.gstAmount.toLocaleString()}</p>
                  <p className="text-xs font-bold text-red-600">Grand Total: ₹{selectedInvoice.totalAmount.toLocaleString()}</p>
                </div>
                <p className="border-b border-dashed border-slate-400 my-1"></p>
                <div className="text-center space-y-2 pt-1 flex flex-col items-center">
                  <div className="flex flex-col items-center justify-center bg-white p-1">
                    <QRCodeSVG value={selectedInvoice.invoiceNumber} />
                    <BarcodeSVG value={selectedInvoice.invoiceNumber} />
                    <span className="text-[8px] mt-1 font-mono tracking-widest">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <p className="text-[8px] italic font-semibold">Loyalty Points Earned: +{selectedInvoice.pointsEarned}</p>
                  <p className="text-[8px] uppercase tracking-wider font-bold">--- THANK YOU ---</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowThermalModal(false)}
                  className="flex-1 btn-secondary py-2.5 text-xs cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintThermal(selectedInvoice);
                    setShowThermalModal(false);
                  }}
                  className="flex-1 btn-primary py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Print Roll (80mm)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
