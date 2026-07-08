import { Router, Request, Response } from 'express';
import { db, Invoice, Customer, Warranty } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/billing/invoices
// @desc    Get invoice history
router.get('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const branch = req.headers['x-branch'] as string || req.query.branch as string;
    const invoices = await db.invoices.find(branch ? { branch } : undefined);
    // Sort invoices descending by date
    invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/billing/invoices
// @desc    Create new invoice / record sale
router.post('/invoices', authenticate, async (req: Request, res: Response) => {
  const { customerName, mobileNumber, vehicleNumber, items, discount, paymentMethod } = req.body;
  const branch = req.body.branch || req.headers['x-branch'] as string || 'New Delhi Branch (HQ)';

  if (!customerName || !mobileNumber || !items || !items.length || !paymentMethod) {
    return res.status(400).json({ message: 'Missing billing details or products.' });
  }

  try {
    // 1. Validate stock levels and compute totals
    let subtotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = await db.products.findOne({ id: item.productId, branch });
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found in branch ${branch}.` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.brand} ${product.model}. Available: ${product.quantity}` });
      }

      subtotal += product.sellingPrice * item.quantity;
      invoiceItems.push({
        productId: product.id,
        brand: product.brand,
        model: product.model,
        quantity: item.quantity,
        price: product.sellingPrice
      });
    }

    // Apply discount
    const discountAmt = Number(discount) || 0;
    const taxableAmount = Math.max(0, subtotal - discountAmt);
    // Standard GST of 18%
    const gstAmount = Math.round(taxableAmount * 0.18);
    const totalAmount = taxableAmount + gstAmount;

    // Generate Invoice Number
    const allInvoices = await db.invoices.find();
    const invCount = allInvoices.length + 1;
    const formattedCount = String(invCount).padStart(4, '0');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${formattedCount}`;

    // Loyalty Points (1 point per 100 Rs of subtotal)
    const pointsEarned = Math.floor(subtotal / 100);

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber,
      customerName,
      mobileNumber,
      vehicleNumber: vehicleNumber || '',
      items: invoiceItems,
      subtotal,
      discount: discountAmt,
      gstAmount,
      totalAmount,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      pointsEarned,
      branch
    };

    // Save Invoice
    const savedInvoice = await db.invoices.create(newInvoice);

    // 2. Adjust product quantities in inventory
    for (const item of items) {
      const product = await db.products.findOne({ id: item.productId, branch });
      if (product) {
        await db.products.update(product.id, {
          quantity: product.quantity - item.quantity
        }, branch);
      }
    }

    // 3. Customer loyalty points & installation history updates
    let customer = await db.customers.findOne({ mobile: mobileNumber });
    const installationHistoryEntries = invoiceItems.map(item => ({
      batteryModel: item.model,
      brand: item.brand,
      date: newInvoice.date
    }));

    if (customer) {
      // Existing customer, update points & history
      const updatedHistory = [...customer.installationHistory, ...installationHistoryEntries];
      const serviceRecords = [...customer.serviceRecords, {
        date: newInvoice.date,
        description: `Purchased ${invoiceItems.map(i => `${i.brand} ${i.model} (x${i.quantity})`).join(', ')}. Invoice: ${invoiceNumber}`,
        vehicleNumber: vehicleNumber || customer.vehicleNumber
      }];

      await db.customers.update(customer.id, {
        loyaltyPoints: customer.loyaltyPoints + pointsEarned,
        installationHistory: updatedHistory,
        serviceRecords,
        vehicleNumber: vehicleNumber || customer.vehicleNumber // update vehicle if provided
      });
    } else {
      // Create new customer profile
      const newCustomer: Customer = {
        id: 'cust_' + Date.now(),
        name: customerName,
        mobile: mobileNumber,
        address: '',
        vehicleNumber: vehicleNumber || '',
        loyaltyPoints: pointsEarned,
        installationHistory: installationHistoryEntries,
        serviceRecords: [{
          date: newInvoice.date,
          description: `First Purchase. Installed ${invoiceItems.map(i => `${i.brand} ${i.model}`).join(', ')}. Invoice: ${invoiceNumber}`,
          vehicleNumber: vehicleNumber || ''
        }]
      };
      await db.customers.create(newCustomer);
    }

    // 4. Auto-register warranty claims certificates
    for (const item of invoiceItems) {
      const product = await db.products.findOne({ id: item.productId, branch });
      if (product) {
        // Calculate warranty expiry date
        const purchaseDateObj = new Date(newInvoice.date);
        purchaseDateObj.setMonth(purchaseDateObj.getMonth() + product.warrantyPeriod);
        const expiryDate = purchaseDateObj.toISOString().split('T')[0];

        const newWarranty: Warranty = {
          id: 'warr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          warrantyId: `WAR-${item.brand.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
          customerName,
          customerMobile: mobileNumber,
          batteryModel: item.model,
          batteryBrand: item.brand,
          purchaseDate: newInvoice.date,
          expiryDate,
          claimStatus: 'Active',
          claims: []
        };
        await db.warranties.create(newWarranty);
      }
    }

    res.status(201).json(savedInvoice);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
