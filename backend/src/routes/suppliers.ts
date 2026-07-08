import { Router, Request, Response } from 'express';
import { db, Supplier, SupplierLedgerEntry } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/suppliers
// @desc    Get all suppliers
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const suppliers = await db.suppliers.find();
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   GET /api/suppliers/:id
// @desc    Get details and ledger of a supplier
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const supplier = await db.suppliers.findOne({ id: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }
    res.json(supplier);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/suppliers
// @desc    Create new supplier profile
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { name, contactPerson, mobile, address, productsSupplied } = req.body;

  if (!name || !contactPerson || !mobile) {
    return res.status(400).json({ message: 'Please provide name, contact person and mobile.' });
  }

  try {
    const newSupplier: Supplier = {
      id: 'sup_' + Date.now(),
      name,
      contactPerson,
      mobile,
      address: address || '',
      productsSupplied: productsSupplied || [],
      pendingPayments: 0,
      ledger: []
    };

    const saved = await db.suppliers.create(newSupplier);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/suppliers/:id/payments
// @desc    Record a payment made to a supplier (Deducts pending payment, adds to ledger)
router.post('/:id/payments', authenticate, async (req: Request, res: Response) => {
  const { amount, description } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Please provide a valid payment amount.' });
  }

  try {
    const supplier = await db.suppliers.findOne({ id: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const payAmt = Number(amount);
    const ledgerEntry: SupplierLedgerEntry = {
      id: 'ld_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: 'Payment',
      amount: payAmt,
      description: description || 'Bank Transfer Payment'
    };

    const updatedLedger = [...supplier.ledger, ledgerEntry];
    const newPending = Math.max(0, supplier.pendingPayments - payAmt);

    const updated = await db.suppliers.update(supplier.id, {
      ledger: updatedLedger,
      pendingPayments: newPending
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
