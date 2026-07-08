import { Router, Request, Response } from 'express';
import { db, Purchase, SupplierLedgerEntry } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/purchases
// @desc    Get all purchase orders / stock entries
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const branch = req.headers['x-branch'] as string || req.query.branch as string;
    let purchases = await db.purchases.find();
    if (branch) {
      purchases = purchases.filter(p => p.branch === branch);
    }
    // Sort descending by date
    purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(purchases);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/purchases
// @desc    Create a new purchase (Adds stock to product, updates supplier ledger & pending payments)
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { supplierId, productId, quantity, purchaseCost, invoiceNumber } = req.body;
  const branch = req.body.branch || req.headers['x-branch'] as string || 'New Delhi Branch (HQ)';

  if (!supplierId || !productId || !quantity || !purchaseCost) {
    return res.status(400).json({ message: 'Please provide supplierId, productId, quantity, and purchaseCost.' });
  }

  try {
    // Validate supplier
    const supplier = await db.suppliers.findOne({ id: supplierId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    // Validate product
    const product = await db.products.findOne({ id: productId, branch });
    if (!product) {
      return res.status(404).json({ message: `Product not found in branch ${branch}. Add it to products first.` });
    }

    // Generate Purchase ID
    const allPurchases = await db.purchases.find();
    const purchaseId = `PUR-${new Date().getFullYear()}-${String(allPurchases.length + 1).padStart(4, '0')}`;

    const newPurchase: Purchase = {
      id: 'pur_' + Date.now(),
      purchaseId,
      supplierId,
      supplierName: supplier.name,
      productId,
      productBrand: product.brand,
      productModel: product.model,
      quantity: Number(quantity),
      purchaseCost: Number(purchaseCost),
      invoiceNumber: invoiceNumber || `SUP-INV-${Date.now().toString().substring(8)}`,
      date: new Date().toISOString().split('T')[0],
      branch
    };

    // 1. Add Purchase Record
    const savedPurchase = await db.purchases.create(newPurchase);

    // 2. Increase Inventory Stock
    await db.products.update(product.id, {
      quantity: product.quantity + Number(quantity)
    }, branch);

    // 3. Update Supplier Pending Payments & Ledger
    const ledgerEntry: SupplierLedgerEntry = {
      id: 'ld_' + Date.now(),
      date: newPurchase.date,
      type: 'Purchase',
      amount: Number(purchaseCost),
      description: `Purchase of ${quantity}x ${product.brand} ${product.model} (Invoice: ${newPurchase.invoiceNumber})`
    };

    await db.suppliers.update(supplier.id, {
      pendingPayments: supplier.pendingPayments + Number(purchaseCost),
      ledger: [...supplier.ledger, ledgerEntry]
    });

    res.status(201).json(savedPurchase);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
