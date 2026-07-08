import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Types and Interfaces
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'staff';
  permissions: string[]; // e.g., 'billing', 'inventory', 'customers', 'reports', 'settings'
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  vehicleType: 'Car' | 'Bike' | 'Truck' | 'Tractor' | 'Inverter';
  capacity: number; // Ah
  warrantyPeriod: number; // in months
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplier: string;
  location: string;
  branch: string; // branch affiliation
}

export interface InvoiceItem {
  productId: string;
  brand: string;
  model: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  mobileNumber: string;
  vehicleNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Credit';
  date: string;
  pointsEarned: number;
  branch: string; // branch affiliation
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  vehicleNumber: string;
  loyaltyPoints: number;
  installationHistory: Array<{
    batteryModel: string;
    brand: string;
    date: string;
  }>;
  serviceRecords: Array<{
    date: string;
    description: string;
    vehicleNumber: string;
  }>;
}

export interface WarrantyClaim {
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Warranty {
  id: string;
  warrantyId: string;
  customerName: string;
  customerMobile: string;
  batteryModel: string;
  batteryBrand: string;
  purchaseDate: string;
  expiryDate: string;
  claimStatus: 'Active' | 'Claimed' | 'Expired';
  claims: WarrantyClaim[];
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: 'Purchase' | 'Payment';
  amount: number;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  address: string;
  productsSupplied: string[];
  pendingPayments: number;
  ledger: SupplierLedgerEntry[];
}

export interface Purchase {
  id: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productBrand: string;
  productModel: string;
  quantity: number;
  purchaseCost: number;
  invoiceNumber: string;
  date: string;
  branch: string; // branch affiliation
}

export interface BranchTransfer {
  id: string;
  productId: string;
  productBrand: string;
  productModel: string;
  quantity: number;
  sourceBranch: string;
  destinationBranch: string;
  date: string;
  status: 'Dispatched' | 'Received';
}

export interface Notification {
  id: string;
  type: 'stock' | 'warranty' | 'payment' | 'order' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface ShopSettings {
  shopName: string;
  gstNumber: string;
  address: string;
  logoUrl: string;
  invoiceFormat: string; // e.g., 'INV-YYYY-XXXX'
  whatsappTemplate: string;
  emailTemplate: string;
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  multiBranch: boolean;
  branches: string[];
}

// Full DB State Structure for Local JSON mode
interface DBState {
  users: User[];
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  warranties: Warranty[];
  suppliers: Supplier[];
  purchases: Purchase[];
  settings: ShopSettings;
  transfers: BranchTransfer[]; // added
  notifications: Notification[]; // added
}

// In-Memory Data State
let dbState: DBState;
const DB_FILE = path.join(__dirname, 'db.json');

// Mongoose Schemas for MongoDB mode (if MongoDB is connected)
let isMongoActive = false;

// Initialize JSON database with extensive mock data to look like a running business
function getMockState(): DBState {
  // Let's create mock data spanning past few months
  const now = new Date();
  
  const mockUsers: User[] = [
    {
      id: 'usr_admin',
      email: 'admin@carbattery.com',
      // bcrypt hash for 'Admin@123'
      passwordHash: '$2a$10$8ddqRGqizjBKnAPp8qHoWeQCeUIPGNB63ewdj5r4RpnoscetmjPQi',
      name: 'Super Admin',
      role: 'admin',
      permissions: ['billing', 'inventory', 'customers', 'reports', 'settings', 'staff']
    },
    {
      id: 'usr_staff',
      email: 'staff@carbattery.com',
      // bcrypt hash for 'Staff@123'
      passwordHash: '$2a$10$0XhOmmAeRXTzMQpJRbOPXOGHsGVc3GXvKlZNCoSoxzkHFKftke8Qu',
      name: 'Rohan Sharma',
      role: 'staff',
      permissions: ['billing', 'customers', 'inventory']
    }

  ];

  const mockProducts: Product[] = [
    // Delhi Branch products
    {
      id: 'BAT-001',
      brand: 'Exide',
      model: 'Express 100AH',
      vehicleType: 'Car',
      capacity: 100,
      warrantyPeriod: 36,
      purchasePrice: 4200,
      sellingPrice: 5800,
      quantity: 15,
      supplier: 'Exide Distributors North',
      location: 'Rack A-1',
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'BAT-002',
      brand: 'Amaron',
      model: 'Hi-Life 80AH',
      vehicleType: 'Car',
      capacity: 80,
      warrantyPeriod: 48,
      purchasePrice: 3500,
      sellingPrice: 4900,
      quantity: 22,
      supplier: 'Amaron Agency Ltd',
      location: 'Rack A-2',
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'BAT-003',
      brand: 'SF Sonic',
      model: 'PowerBox 40AH',
      vehicleType: 'Bike',
      capacity: 40,
      warrantyPeriod: 24,
      purchasePrice: 1500,
      sellingPrice: 2200,
      quantity: 4,
      supplier: 'SF Sonic Distributors',
      location: 'Rack B-1',
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'BAT-004',
      brand: 'Exide',
      model: 'Milege 60AH',
      vehicleType: 'Car',
      capacity: 60,
      warrantyPeriod: 36,
      purchasePrice: 2800,
      sellingPrice: 3800,
      quantity: 18,
      supplier: 'Exide Distributors North',
      location: 'Rack A-3',
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'BAT-005',
      brand: 'Luminous',
      model: 'Solar 150AH',
      vehicleType: 'Inverter',
      capacity: 150,
      warrantyPeriod: 60,
      purchasePrice: 8500,
      sellingPrice: 11500,
      quantity: 9,
      supplier: 'Luminous Power Corp',
      location: 'Floor Section C',
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'BAT-006',
      brand: 'Amaron',
      model: 'Pro 150AH',
      vehicleType: 'Truck',
      capacity: 150,
      warrantyPeriod: 36,
      purchasePrice: 9000,
      sellingPrice: 12500,
      quantity: 3,
      supplier: 'Amaron Agency Ltd',
      location: 'Floor Section D',
      branch: 'New Delhi Branch (HQ)'
    },
    // Noida Branch products
    {
      id: 'BAT-001',
      brand: 'Exide',
      model: 'Express 100AH',
      vehicleType: 'Car',
      capacity: 100,
      warrantyPeriod: 36,
      purchasePrice: 4200,
      sellingPrice: 5800,
      quantity: 8,
      supplier: 'Exide Distributors North',
      location: 'Noida Rack A-1',
      branch: 'Noida Service Center'
    },
    {
      id: 'BAT-002',
      brand: 'Amaron',
      model: 'Hi-Life 80AH',
      vehicleType: 'Car',
      capacity: 80,
      warrantyPeriod: 48,
      purchasePrice: 3500,
      sellingPrice: 4900,
      quantity: 12,
      supplier: 'Amaron Agency Ltd',
      location: 'Noida Rack A-2',
      branch: 'Noida Service Center'
    },
    {
      id: 'BAT-003',
      brand: 'SF Sonic',
      model: 'PowerBox 40AH',
      vehicleType: 'Bike',
      capacity: 40,
      warrantyPeriod: 24,
      purchasePrice: 1500,
      sellingPrice: 2200,
      quantity: 15,
      supplier: 'SF Sonic Distributors',
      location: 'Noida Rack B-1',
      branch: 'Noida Service Center'
    },
    // Gurugram Branch products
    {
      id: 'BAT-002',
      brand: 'Amaron',
      model: 'Hi-Life 80AH',
      vehicleType: 'Car',
      capacity: 80,
      warrantyPeriod: 48,
      purchasePrice: 3500,
      sellingPrice: 4900,
      quantity: 5,
      supplier: 'Amaron Agency Ltd',
      location: 'G-Rack-01',
      branch: 'Gurugram Outlet'
    },
    {
      id: 'BAT-004',
      brand: 'Exide',
      model: 'Milege 60AH',
      vehicleType: 'Car',
      capacity: 60,
      warrantyPeriod: 36,
      purchasePrice: 2800,
      sellingPrice: 3800,
      quantity: 20,
      supplier: 'Exide Distributors North',
      location: 'G-Rack-02',
      branch: 'Gurugram Outlet'
    },
    {
      id: 'BAT-005',
      brand: 'Luminous',
      model: 'Solar 150AH',
      vehicleType: 'Inverter',
      capacity: 150,
      warrantyPeriod: 60,
      purchasePrice: 8500,
      sellingPrice: 11500,
      quantity: 2,
      supplier: 'Luminous Power Corp',
      location: 'G-Floor-01',
      branch: 'Gurugram Outlet'
    }
  ];

  const mockCustomers: Customer[] = [
    {
      id: 'cust_1',
      name: 'Amit Patel',
      mobile: '9876543210',
      address: 'Sector 15, Dwarka, Delhi',
      vehicleNumber: 'DL3CA1234',
      loyaltyPoints: 120,
      installationHistory: [
        { batteryModel: 'Express 100AH', brand: 'Exide', date: '2025-10-12' }
      ],
      serviceRecords: [
        { date: '2025-10-12', description: 'Battery installation & terminal grease application', vehicleNumber: 'DL3CA1234' },
        { date: '2026-04-12', description: '6-month gravity check and distilled water top-up', vehicleNumber: 'DL3CA1234' }
      ]
    },
    {
      id: 'cust_2',
      name: 'Priya Sen',
      mobile: '9123456789',
      address: 'Salt Lake, Sector V, Kolkata',
      vehicleNumber: 'WB02D9876',
      loyaltyPoints: 45,
      installationHistory: [
        { batteryModel: 'Hi-Life 80AH', brand: 'Amaron', date: '2026-02-15' }
      ],
      serviceRecords: [
        { date: '2026-02-15', description: 'New Amaron battery installed. Voltage reading: 12.6V', vehicleNumber: 'WB02D9876' }
      ]
    },
    {
      id: 'cust_3',
      name: 'John Doe',
      mobile: '9988776655',
      address: 'Andheri West, Mumbai',
      vehicleNumber: 'MH02B5555',
      loyaltyPoints: 15,
      installationHistory: [
        { batteryModel: 'PowerBox 40AH', brand: 'SF Sonic', date: '2026-05-01' }
      ],
      serviceRecords: []
    }
  ];

  // Helper to generate past dates
  const getDateAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const mockInvoices: Invoice[] = [
    {
      id: 'inv_1',
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Amit Patel',
      mobileNumber: '9876543210',
      vehicleNumber: 'DL3CA1234',
      items: [
        { productId: 'BAT-001', brand: 'Exide', model: 'Express 100AH', quantity: 1, price: 5800 }
      ],
      subtotal: 5800,
      discount: 200,
      gstAmount: 1008, // 18% GST on 5600
      totalAmount: 6608,
      paymentMethod: 'UPI',
      date: getDateAgo(60),
      pointsEarned: 58,
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'inv_2',
      invoiceNumber: 'INV-2026-0002',
      customerName: 'Priya Sen',
      mobileNumber: '9123456789',
      vehicleNumber: 'WB02D9876',
      items: [
        { productId: 'BAT-002', brand: 'Amaron', model: 'Hi-Life 80AH', quantity: 1, price: 4900 }
      ],
      subtotal: 4900,
      discount: 0,
      gstAmount: 882, // 18% GST
      totalAmount: 5782,
      paymentMethod: 'Card',
      date: getDateAgo(30),
      pointsEarned: 49,
      branch: 'Noida Service Center'
    },
    {
      id: 'inv_3',
      invoiceNumber: 'INV-2026-0003',
      customerName: 'John Doe',
      mobileNumber: '9988776655',
      vehicleNumber: 'MH02B5555',
      items: [
        { productId: 'BAT-003', brand: 'SF Sonic', model: 'PowerBox 40AH', quantity: 1, price: 2200 }
      ],
      subtotal: 2200,
      discount: 100,
      gstAmount: 378,
      totalAmount: 2478,
      paymentMethod: 'Cash',
      date: getDateAgo(5),
      pointsEarned: 22,
      branch: 'New Delhi Branch (HQ)'
    },
    // Adding extra invoices across the past 4 months for rich reporting data
    {
      id: 'inv_4',
      invoiceNumber: 'INV-2026-0004',
      customerName: 'Rajesh Kumar',
      mobileNumber: '9888777666',
      vehicleNumber: 'HR26B1290',
      items: [
        { productId: 'BAT-001', brand: 'Exide', model: 'Express 100AH', quantity: 2, price: 5800 }
      ],
      subtotal: 11600,
      discount: 500,
      gstAmount: 1998,
      totalAmount: 13098,
      paymentMethod: 'UPI',
      date: getDateAgo(120),
      pointsEarned: 116,
      branch: 'Gurugram Outlet'
    },
    {
      id: 'inv_5',
      invoiceNumber: 'INV-2026-0005',
      customerName: 'Vijay Yadav',
      mobileNumber: '9777666555',
      vehicleNumber: 'UP16C7788',
      items: [
        { productId: 'BAT-005', brand: 'Luminous', model: 'Solar 150AH', quantity: 1, price: 11500 }
      ],
      subtotal: 11500,
      discount: 1000,
      gstAmount: 1890,
      totalAmount: 12390,
      paymentMethod: 'Credit',
      date: getDateAgo(90),
      pointsEarned: 115,
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'inv_6',
      invoiceNumber: 'INV-2026-0006',
      customerName: 'Kunal Shah',
      mobileNumber: '9666555444',
      vehicleNumber: 'MH12D1122',
      items: [
        { productId: 'BAT-004', brand: 'Exide', model: 'Milege 60AH', quantity: 1, price: 3800 }
      ],
      subtotal: 3800,
      discount: 100,
      gstAmount: 666,
      totalAmount: 4366,
      paymentMethod: 'Cash',
      date: getDateAgo(15),
      pointsEarned: 38,
      branch: 'Noida Service Center'
    }
  ];

  const mockWarranties: Warranty[] = [
    {
      id: 'warr_1',
      warrantyId: 'WAR-EXI-82910',
      customerName: 'Amit Patel',
      customerMobile: '9876543210',
      batteryModel: 'Express 100AH',
      batteryBrand: 'Exide',
      purchaseDate: '2025-10-12',
      expiryDate: '2028-10-12', // 36 months
      claimStatus: 'Active',
      claims: []
    },
    {
      id: 'warr_2',
      warrantyId: 'WAR-AMA-10928',
      customerName: 'Priya Sen',
      customerMobile: '9123456789',
      batteryModel: 'Hi-Life 80AH',
      batteryBrand: 'Amaron',
      purchaseDate: '2026-02-15',
      expiryDate: '2030-02-15', // 48 months
      claimStatus: 'Active',
      claims: []
    },
    {
      id: 'warr_3',
      warrantyId: 'WAR-SFS-77810',
      customerName: 'John Doe',
      customerMobile: '9988776655',
      batteryModel: 'PowerBox 40AH',
      batteryBrand: 'SF Sonic',
      purchaseDate: '2026-05-01',
      expiryDate: '2028-05-01',
      claimStatus: 'Claimed',
      claims: [
        {
          date: '2026-05-20',
          reason: 'Battery drawing no current, sudden backup drop',
          status: 'Approved'
        }
      ]
    },
    {
      id: 'warr_4',
      warrantyId: 'WAR-EXI-55210',
      customerName: 'Kunal Shah',
      customerMobile: '9666555444',
      batteryModel: 'Milege 60AH',
      batteryBrand: 'Exide',
      purchaseDate: '2023-05-15',
      expiryDate: '2026-05-15', // Expired recently!
      claimStatus: 'Expired',
      claims: []
    }
  ];

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup_1',
      name: 'Exide Distributors North',
      contactPerson: 'Sanjay Kapoor',
      mobile: '9811122233',
      address: 'Industrial Area Phase 2, New Delhi',
      productsSupplied: ['Express 100AH', 'Milege 60AH'],
      pendingPayments: 15000,
      ledger: [
        { id: 'ld_1', date: getDateAgo(30), type: 'Purchase', amount: 42000, description: 'Purchase of 10x Express 100AH' },
        { id: 'ld_2', date: getDateAgo(25), type: 'Payment', amount: 27000, description: 'Partial Bank Transfer' }
      ]
    },
    {
      id: 'sup_2',
      name: 'Amaron Agency Ltd',
      contactPerson: 'Karan Malhotra',
      mobile: '9822233344',
      address: 'GIDC Estate, Vadodara, Gujarat',
      productsSupplied: ['Hi-Life 80AH', 'Pro 150AH'],
      pendingPayments: 0,
      ledger: [
        { id: 'ld_3', date: getDateAgo(40), type: 'Purchase', amount: 35000, description: 'Purchase of 10x Hi-Life 80AH' },
        { id: 'ld_4', date: getDateAgo(35), type: 'Payment', amount: 35000, description: 'Full Payment via RTGS' }
      ]
    },
    {
      id: 'sup_3',
      name: 'SF Sonic Distributors',
      contactPerson: 'Manoj Joshi',
      mobile: '9833344455',
      address: 'Pimpri, Pune',
      productsSupplied: ['PowerBox 40AH'],
      pendingPayments: 7500,
      ledger: [
        { id: 'ld_5', date: getDateAgo(10), type: 'Purchase', amount: 7500, description: 'Purchase of 5x PowerBox 40AH' }
      ]
    }
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 'pur_1',
      purchaseId: 'PUR-2026-0001',
      supplierId: 'sup_1',
      supplierName: 'Exide Distributors North',
      productId: 'BAT-001',
      productBrand: 'Exide',
      productModel: 'Express 100AH',
      quantity: 10,
      purchaseCost: 42000,
      invoiceNumber: 'EX-9921',
      date: getDateAgo(30),
      branch: 'New Delhi Branch (HQ)'
    },
    {
      id: 'pur_2',
      purchaseId: 'PUR-2026-0002',
      supplierId: 'sup_2',
      supplierName: 'Amaron Agency Ltd',
      productId: 'BAT-002',
      productBrand: 'Amaron',
      productModel: 'Hi-Life 80AH',
      quantity: 10,
      purchaseCost: 35000,
      invoiceNumber: 'AM-4451',
      date: getDateAgo(40),
      branch: 'Noida Service Center'
    },
    {
      id: 'pur_3',
      purchaseId: 'PUR-2026-0003',
      supplierId: 'sup_3',
      supplierName: 'SF Sonic Distributors',
      productId: 'BAT-003',
      productBrand: 'SF Sonic',
      productModel: 'PowerBox 40AH',
      quantity: 5,
      purchaseCost: 7500,
      invoiceNumber: 'SF-1029',
      date: getDateAgo(10),
      branch: 'New Delhi Branch (HQ)'
    }
  ];

  const mockSettings: ShopSettings = {
    shopName: 'RED ACCENT CAR BATTERY HUB',
    gstNumber: '07AAAAA1111A1Z1',
    address: 'Plot 42, Main Road, Sector 6, Dwarka, New Delhi - 110075',
    logoUrl: '',
    invoiceFormat: 'INV-YYYY-XXXX',
    whatsappTemplate: 'Hello {CustomerName}, thank you for purchasing {BatteryBrand} {BatteryModel} from RED ACCENT CAR BATTERY HUB. Your invoice total is Rs. {InvoiceTotal}. Warranty Expiry: {WarrantyExpiry}. Stay safe!',
    emailTemplate: 'Dear {CustomerName},\n\nThank you for choosing RED ACCENT CAR BATTERY HUB.\n\nAttached is your invoice {InvoiceNumber} for the purchase of {BatteryBrand} {BatteryModel}.\nYour warranty is valid till {WarrantyExpiry}.\n\nBest Regards,\nRED ACCENT CAR BATTERY HUB',
    emailHost: 'smtp.carbattery.com',
    emailPort: 587,
    emailUser: 'billing@carbattery.com',
    emailPass: 'Smtp@123',
    multiBranch: true,
    branches: ['New Delhi Branch (HQ)', 'Noida Service Center', 'Gurugram Outlet']
  };

  const mockTransfers: BranchTransfer[] = [
    {
      id: 'tx_1',
      productId: 'BAT-001',
      productBrand: 'Exide',
      productModel: 'Express 100AH',
      quantity: 5,
      sourceBranch: 'New Delhi Branch (HQ)',
      destinationBranch: 'Noida Service Center',
      date: getDateAgo(2),
      status: 'Received'
    }
  ];

  const mockNotifications: Notification[] = [
    {
      id: 'notif_1',
      type: 'stock',
      title: 'Low Stock Alert',
      message: 'SF Sonic PowerBox 40AH is running low (4 units left) in New Delhi Branch (HQ).',
      date: getDateAgo(1),
      read: false
    },
    {
      id: 'notif_2',
      type: 'warranty',
      title: 'Pending Warranty Claim',
      message: 'New warranty claim filed by John Doe for SF Sonic PowerBox 40AH.',
      date: getDateAgo(3),
      read: false
    },
    {
      id: 'notif_3',
      type: 'payment',
      title: 'Pending Supplier Dues',
      message: 'Outstanding balance of ₹15,000 to Exide Distributors North is overdue.',
      date: getDateAgo(5),
      read: true
    }
  ];

  return {
    users: mockUsers,
    products: mockProducts,
    invoices: mockInvoices,
    customers: mockCustomers,
    warranties: mockWarranties,
    suppliers: mockSuppliers,
    purchases: mockPurchases,
    settings: mockSettings,
    transfers: mockTransfers,
    notifications: mockNotifications
  };
}

// Write file state
function saveLocalDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local JSON database:', err);
  }
}

// Initialize database connection
export async function initDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/carbattery';
  try {
    console.log('Attempting to connect to MongoDB...');
    // We set a strict 3-second timeout for MongoDB connection so the server starts quickly even if MongoDB isn't running
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 });
    isMongoActive = true;
    console.log('MongoDB successfully connected.');
    
    // Seed MongoDB if empty
    const collections = mongoose.connection.db 
      ? await mongoose.connection.db.listCollections().toArray()
      : [];
    if (collections.length === 0) {
      console.log('MongoDB is empty. Seeding with mock data...');
      const mock = getMockState();
      
      // We will define MongoDB models below and seed them
      await seedMongoDB(mock);
    }
  } catch (err: any) {
    console.warn(`MongoDB connection failed: ${err.message}. Falling back to local JSON database.`);
    isMongoActive = false;
    
    // Load local JSON database
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        dbState = JSON.parse(raw);
        console.log('Loaded database state from local db.json.');
      } catch (e) {
        console.error('Local db.json corrupt. Resetting with mock data.');
        dbState = getMockState();
        saveLocalDB();
      }
    } else {
      console.log('Creating new local db.json with pre-seeded mock data.');
      dbState = getMockState();
      saveLocalDB();
    }
  }
}

// ----------------------------------------------------
// MongoDB Mongoose Models
// ----------------------------------------------------
const UserSchema = new mongoose.Schema({
  id: String,
  email: String,
  passwordHash: String,
  name: String,
  role: String,
  permissions: [String]
});
const MongoUser = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
  id: String,
  brand: String,
  model: String,
  vehicleType: String,
  capacity: Number,
  warrantyPeriod: Number,
  purchasePrice: Number,
  sellingPrice: Number,
  quantity: Number,
  supplier: String,
  location: String,
  branch: String
});
const MongoProduct = mongoose.model('Product', ProductSchema);

const InvoiceSchema = new mongoose.Schema({
  id: String,
  invoiceNumber: String,
  customerName: String,
  mobileNumber: String,
  vehicleNumber: String,
  items: [{
    productId: String,
    brand: String,
    model: String,
    quantity: Number,
    price: Number
  }],
  subtotal: Number,
  discount: Number,
  gstAmount: Number,
  totalAmount: Number,
  paymentMethod: String,
  date: String,
  pointsEarned: Number,
  branch: String
});
const MongoInvoice = mongoose.model('Invoice', InvoiceSchema);

const CustomerSchema = new mongoose.Schema({
  id: String,
  name: String,
  mobile: String,
  address: String,
  vehicleNumber: String,
  loyaltyPoints: Number,
  installationHistory: [{ batteryModel: String, brand: String, date: String }],
  serviceRecords: [{ date: String, description: String, vehicleNumber: String }]
});
const MongoCustomer = mongoose.model('Customer', CustomerSchema);

const WarrantySchema = new mongoose.Schema({
  id: String,
  warrantyId: String,
  customerName: String,
  customerMobile: String,
  batteryModel: String,
  batteryBrand: String,
  purchaseDate: String,
  expiryDate: String,
  claimStatus: String,
  claims: [{ date: String, reason: String, status: String }]
});
const MongoWarranty = mongoose.model('Warranty', WarrantySchema);

const SupplierSchema = new mongoose.Schema({
  id: String,
  name: String,
  contactPerson: String,
  mobile: String,
  address: String,
  productsSupplied: [String],
  pendingPayments: Number,
  ledger: [{ id: String, date: String, type: String, amount: Number, description: String }]
});
const MongoSupplier = mongoose.model('Supplier', SupplierSchema);

const PurchaseSchema = new mongoose.Schema({
  id: String,
  purchaseId: String,
  supplierId: String,
  supplierName: String,
  productId: String,
  productBrand: String,
  productModel: String,
  quantity: Number,
  purchaseCost: Number,
  invoiceNumber: String,
  date: String,
  branch: String
});
const MongoPurchase = mongoose.model('Purchase', PurchaseSchema);

const BranchTransferSchema = new mongoose.Schema({
  id: String,
  productId: String,
  productBrand: String,
  productModel: String,
  quantity: Number,
  sourceBranch: String,
  destinationBranch: String,
  date: String,
  status: String
});
const MongoBranchTransfer = mongoose.model('BranchTransfer', BranchTransferSchema);

const NotificationSchema = new mongoose.Schema({
  id: String,
  type: String,
  title: String,
  message: String,
  date: String,
  read: Boolean
});
const MongoNotification = mongoose.model('Notification', NotificationSchema);

const SettingsSchema = new mongoose.Schema({
  shopName: String,
  gstNumber: String,
  address: String,
  logoUrl: String,
  invoiceFormat: String,
  whatsappTemplate: String,
  emailTemplate: String,
  emailHost: String,
  emailPort: Number,
  emailUser: String,
  emailPass: String,
  multiBranch: Boolean,
  branches: [String]
});
const MongoSettings = mongoose.model('Settings', SettingsSchema);

// Seed MongoDB helper
async function seedMongoDB(mock: DBState) {
  await MongoUser.insertMany(mock.users);
  await MongoProduct.insertMany(mock.products);
  await MongoInvoice.insertMany(mock.invoices);
  await MongoCustomer.insertMany(mock.customers);
  await MongoWarranty.insertMany(mock.warranties);
  await MongoSupplier.insertMany(mock.suppliers);
  await MongoPurchase.insertMany(mock.purchases);
  await MongoBranchTransfer.insertMany(mock.transfers);
  await MongoNotification.insertMany(mock.notifications);
  await new MongoSettings(mock.settings).save();
}

// ----------------------------------------------------
// Unified Database Repository Layer
// ----------------------------------------------------
export const db = {
  // Users Operations
  users: {
    find: async (): Promise<User[]> => {
      if (isMongoActive) return (await MongoUser.find()) as any;
      return dbState.users;
    },
    findOne: async (query: Partial<User>): Promise<User | null> => {
      if (isMongoActive) return (await MongoUser.findOne(query)) as any;
      return dbState.users.find(u => {
        return (!query.id || u.id === query.id) && 
               (!query.email || u.email.toLowerCase() === query.email.toLowerCase());
      }) || null;
    },
    create: async (user: User): Promise<User> => {
      if (isMongoActive) return (await MongoUser.create(user)) as any;
      dbState.users.push(user);
      saveLocalDB();
      return user;
    },
    update: async (id: string, updates: Partial<User>): Promise<User | null> => {
      if (isMongoActive) return (await MongoUser.findOneAndUpdate({ id }, { $set: updates }, { new: true })) as any;
      const idx = dbState.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      dbState.users[idx] = { ...dbState.users[idx], ...updates };
      saveLocalDB();
      return dbState.users[idx];
    }
  },

  // Products Operations
  products: {
    find: async (query?: { branch?: string }): Promise<Product[]> => {
      if (isMongoActive) return (await MongoProduct.find(query || {})) as any;
      if (query && query.branch) {
        return dbState.products.filter(p => p.branch === query.branch);
      }
      return dbState.products;
    },
    findOne: async (query: { id: string; branch?: string }): Promise<Product | null> => {
      if (isMongoActive) {
        const filter: any = { id: query.id };
        if (query.branch) filter.branch = query.branch;
        return (await MongoProduct.findOne(filter)) as any;
      }
      return dbState.products.find(p => p.id === query.id && (!query.branch || p.branch === query.branch)) || null;
    },
    create: async (product: Product): Promise<Product> => {
      if (isMongoActive) return (await MongoProduct.create(product)) as any;
      dbState.products.push(product);
      saveLocalDB();
      return product;
    },
    update: async (id: string, updates: Partial<Product>, branch?: string): Promise<Product | null> => {
      if (isMongoActive) {
        const filter: any = { id };
        if (branch) filter.branch = branch;
        return (await MongoProduct.findOneAndUpdate(filter, { $set: updates }, { new: true })) as any;
      }
      const idx = dbState.products.findIndex(p => p.id === id && (!branch || p.branch === branch));
      if (idx === -1) return null;
      dbState.products[idx] = { ...dbState.products[idx], ...updates };
      saveLocalDB();
      return dbState.products[idx];
    },
    delete: async (id: string, branch?: string): Promise<boolean> => {
      if (isMongoActive) {
        const filter: any = { id };
        if (branch) filter.branch = branch;
        const res = await MongoProduct.deleteOne(filter);
        return res.deletedCount > 0;
      }
      const lenBefore = dbState.products.length;
      dbState.products = dbState.products.filter(p => !(p.id === id && (!branch || p.branch === branch)));
      const deleted = dbState.products.length < lenBefore;
      if (deleted) saveLocalDB();
      return deleted;
    }
  },

  // Invoices Operations
  invoices: {
    find: async (query?: { branch?: string }): Promise<Invoice[]> => {
      if (isMongoActive) return (await MongoInvoice.find(query || {})) as any;
      if (query && query.branch) {
        return dbState.invoices.filter(i => i.branch === query.branch);
      }
      return dbState.invoices;
    },
    create: async (invoice: Invoice): Promise<Invoice> => {
      if (isMongoActive) return (await MongoInvoice.create(invoice)) as any;
      dbState.invoices.push(invoice);
      saveLocalDB();
      return invoice;
    }
  },

  // Customers Operations
  customers: {
    find: async (): Promise<Customer[]> => {
      if (isMongoActive) return (await MongoCustomer.find()) as any;
      return dbState.customers;
    },
    findOne: async (query: { mobile?: string; id?: string }): Promise<Customer | null> => {
      if (isMongoActive) {
        return (await MongoCustomer.findOne(query)) as any;
      }
      return dbState.customers.find(c => 
        (query.mobile && c.mobile === query.mobile) || 
        (query.id && c.id === query.id)
      ) || null;
    },
    create: async (customer: Customer): Promise<Customer> => {
      if (isMongoActive) return (await MongoCustomer.create(customer)) as any;
      dbState.customers.push(customer);
      saveLocalDB();
      return customer;
    },
    update: async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
      if (isMongoActive) return (await MongoCustomer.findOneAndUpdate({ id }, { $set: updates }, { new: true })) as any;
      const idx = dbState.customers.findIndex(c => c.id === id);
      if (idx === -1) return null;
      dbState.customers[idx] = { ...dbState.customers[idx], ...updates };
      saveLocalDB();
      return dbState.customers[idx];
    }
  },

  // Warranties Operations
  warranties: {
    find: async (): Promise<Warranty[]> => {
      if (isMongoActive) return (await MongoWarranty.find()) as any;
      return dbState.warranties;
    },
    findOne: async (query: { warrantyId: string }): Promise<Warranty | null> => {
      if (isMongoActive) return (await MongoWarranty.findOne({ warrantyId: query.warrantyId })) as any;
      return dbState.warranties.find(w => w.warrantyId === query.warrantyId) || null;
    },
    create: async (warranty: Warranty): Promise<Warranty> => {
      if (isMongoActive) return (await MongoWarranty.create(warranty)) as any;
      dbState.warranties.push(warranty);
      saveLocalDB();
      return warranty;
    },
    update: async (warrantyId: string, updates: Partial<Warranty>): Promise<Warranty | null> => {
      if (isMongoActive) return (await MongoWarranty.findOneAndUpdate({ warrantyId }, { $set: updates }, { new: true })) as any;
      const idx = dbState.warranties.findIndex(w => w.warrantyId === warrantyId);
      if (idx === -1) return null;
      dbState.warranties[idx] = { ...dbState.warranties[idx], ...updates };
      saveLocalDB();
      return dbState.warranties[idx];
    }
  },

  // Suppliers Operations
  suppliers: {
    find: async (): Promise<Supplier[]> => {
      if (isMongoActive) return (await MongoSupplier.find()) as any;
      return dbState.suppliers;
    },
    findOne: async (query: { id: string }): Promise<Supplier | null> => {
      if (isMongoActive) return (await MongoSupplier.findOne({ id: query.id })) as any;
      return dbState.suppliers.find(s => s.id === query.id) || null;
    },
    create: async (supplier: Supplier): Promise<Supplier> => {
      if (isMongoActive) return (await MongoSupplier.create(supplier)) as any;
      dbState.suppliers.push(supplier);
      saveLocalDB();
      return supplier;
    },
    update: async (id: string, updates: Partial<Supplier>): Promise<Supplier | null> => {
      if (isMongoActive) return (await MongoSupplier.findOneAndUpdate({ id }, { $set: updates }, { new: true })) as any;
      const idx = dbState.suppliers.findIndex(s => s.id === id);
      if (idx === -1) return null;
      dbState.suppliers[idx] = { ...dbState.suppliers[idx], ...updates };
      saveLocalDB();
      return dbState.suppliers[idx];
    }
  },

  // Purchases Operations
  purchases: {
    find: async (): Promise<Purchase[]> => {
      if (isMongoActive) return (await MongoPurchase.find()) as any;
      return dbState.purchases;
    },
    create: async (purchase: Purchase): Promise<Purchase> => {
      if (isMongoActive) return (await MongoPurchase.create(purchase)) as any;
      dbState.purchases.push(purchase);
      saveLocalDB();
      return purchase;
    }
  },

  // Transfers Operations
  transfers: {
    find: async (): Promise<BranchTransfer[]> => {
      if (isMongoActive) return (await MongoBranchTransfer.find()) as any;
      return dbState.transfers || [];
    },
    create: async (transfer: BranchTransfer): Promise<BranchTransfer> => {
      if (isMongoActive) return (await MongoBranchTransfer.create(transfer)) as any;
      if (!dbState.transfers) dbState.transfers = [];
      dbState.transfers.push(transfer);
      saveLocalDB();
      return transfer;
    },
    update: async (id: string, updates: Partial<BranchTransfer>): Promise<BranchTransfer | null> => {
      if (isMongoActive) return (await MongoBranchTransfer.findOneAndUpdate({ id }, { $set: updates }, { new: true })) as any;
      const idx = dbState.transfers.findIndex(t => t.id === id);
      if (idx === -1) return null;
      dbState.transfers[idx] = { ...dbState.transfers[idx], ...updates };
      saveLocalDB();
      return dbState.transfers[idx];
    }
  },

  // Notifications Operations
  notifications: {
    find: async (): Promise<Notification[]> => {
      if (isMongoActive) return (await MongoNotification.find()) as any;
      return dbState.notifications || [];
    },
    create: async (notif: Notification): Promise<Notification> => {
      if (isMongoActive) return (await MongoNotification.create(notif)) as any;
      if (!dbState.notifications) dbState.notifications = [];
      dbState.notifications.push(notif);
      saveLocalDB();
      return notif;
    },
    update: async (id: string, updates: Partial<Notification>): Promise<Notification | null> => {
      if (isMongoActive) return (await MongoNotification.findOneAndUpdate({ id }, { $set: updates }, { new: true })) as any;
      const idx = dbState.notifications.findIndex(n => n.id === id);
      if (idx === -1) return null;
      dbState.notifications[idx] = { ...dbState.notifications[idx], ...updates };
      saveLocalDB();
      return dbState.notifications[idx];
    }
  },

  // Settings Operations
  settings: {
    get: async (): Promise<ShopSettings> => {
      if (isMongoActive) {
        const s = await MongoSettings.findOne();
        if (s) return s as any;
        // Fallback seed
        const mock = getMockState().settings;
        await new MongoSettings(mock).save();
        return mock;
      }
      return dbState.settings;
    },
    update: async (updates: Partial<ShopSettings>): Promise<ShopSettings> => {
      if (isMongoActive) {
        const s = await MongoSettings.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true });
        return s as any;
      }
      dbState.settings = { ...dbState.settings, ...updates };
      saveLocalDB();
      return dbState.settings;
    }
  }
};
