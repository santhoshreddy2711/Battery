import { Router, Request, Response } from 'express';
import { db, Product } from '../db';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

// @route   GET /api/inventory/transfers
// @desc    Get all branch transfer logs
router.get('/transfers', authenticate, async (req: Request, res: Response) => {
  try {
    const list = await db.transfers.find();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/inventory/transfer
// @desc    Transfer stock from source branch to destination branch
router.post('/transfer', authenticate, async (req: Request, res: Response) => {
  const { productId, quantity, sourceBranch, destinationBranch } = req.body;
  if (!productId || !quantity || !sourceBranch || !destinationBranch) {
    return res.status(400).json({ message: 'Please provide all details for the stock transfer.' });
  }

  try {
    const sourceProd = await db.products.findOne({ id: productId, branch: sourceBranch });
    if (!sourceProd) {
      return res.status(404).json({ message: `Product ${productId} not found in ${sourceBranch}.` });
    }

    if (sourceProd.quantity < Number(quantity)) {
      return res.status(400).json({ message: `Insufficient stock in ${sourceBranch}. Available: ${sourceProd.quantity}` });
    }

    // Deduct quantity from source
    await db.products.update(productId, { quantity: sourceProd.quantity - Number(quantity) }, sourceBranch);

    // Add quantity to destination
    const destProd = await db.products.findOne({ id: productId, branch: destinationBranch });
    if (destProd) {
      await db.products.update(productId, { quantity: destProd.quantity + Number(quantity) }, destinationBranch);
    } else {
      // Create clone product in destination branch
      const cloneProduct = {
        ...sourceProd,
        id: productId,
        quantity: Number(quantity),
        branch: destinationBranch,
        location: 'Transfer Inbound'
      };
      await db.products.create(cloneProduct);
    }

    // Register Transfer entry
    const transferEntry = {
      id: 'tx_' + Date.now(),
      productId,
      productBrand: sourceProd.brand,
      productModel: sourceProd.model,
      quantity: Number(quantity),
      sourceBranch,
      destinationBranch,
      date: new Date().toISOString().split('T')[0],
      status: 'Received' as const
    };
    await db.transfers.create(transferEntry);

    // Register Notification
    const notif = {
      id: 'notif_' + Date.now(),
      type: 'stock' as const,
      title: 'Branch Transfer Completed',
      message: `Transferred ${quantity} units of ${sourceProd.brand} ${sourceProd.model} from ${sourceBranch} to ${destinationBranch}.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    await db.notifications.create(notif);

    res.json({ message: 'Stock transfer completed successfully.', transfer: transferEntry });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   GET /api/inventory
// @desc    Get all inventory products with filtering & search (branch aware)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { search, brand, vehicleType, lowStock } = req.query;
    const branch = req.headers['x-branch'] as string || req.query.branch as string;
    let products = await db.products.find(branch ? { branch } : undefined);

    // Filtering by lowStock
    if (lowStock === 'true') {
      products = products.filter(p => p.quantity <= 5); // threshold of 5
    }

    // Filter by Brand
    if (brand && typeof brand === 'string') {
      products = products.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
    }

    // Filter by Vehicle Type
    if (vehicleType && typeof vehicleType === 'string') {
      products = products.filter(p => p.vehicleType.toLowerCase() === vehicleType.toLowerCase());
    }

    // Text Search (Brand, Model, ProductID, Location)
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      products = products.filter(p => 
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get details of a single product
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const branch = req.headers['x-branch'] as string || req.query.branch as string;
    const product = await db.products.findOne({ id: req.params.id, branch });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/inventory
// @desc    Create new product (Requires inventory permission)
router.post('/', authenticate, requirePermission('inventory'), async (req: Request, res: Response) => {
  const { id, brand, model, vehicleType, capacity, warrantyPeriod, purchasePrice, sellingPrice, quantity, supplier, location } = req.body;
  const branch = req.body.branch || req.headers['x-branch'] as string || 'New Delhi Branch (HQ)';

  if (!id || !brand || !model || !vehicleType || !capacity || !warrantyPeriod || !purchasePrice || !sellingPrice || quantity === undefined) {
    return res.status(400).json({ message: 'Please enter all required fields.' });
  }

  try {
    const existing = await db.products.findOne({ id, branch });
    if (existing) {
      return res.status(400).json({ message: 'Product SKU already exists in this branch. Edit quantity instead.' });
    }

    const newProduct: Product = {
      id,
      brand,
      model,
      vehicleType,
      capacity: Number(capacity),
      warrantyPeriod: Number(warrantyPeriod),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
      supplier: supplier || 'Direct Procurement',
      location: location || 'Warehouse',
      branch
    };

    const saved = await db.products.create(newProduct);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update product details (Requires inventory permission)
router.put('/:id', authenticate, requirePermission('inventory'), async (req: Request, res: Response) => {
  const branch = req.headers['x-branch'] as string || req.query.branch as string;
  try {
    const product = await db.products.findOne({ id: req.params.id, branch });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const updates: Partial<Product> = {};
    const fields = ['brand', 'model', 'vehicleType', 'capacity', 'warrantyPeriod', 'purchasePrice', 'sellingPrice', 'quantity', 'supplier', 'location'];
    
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (['capacity', 'warrantyPeriod', 'purchasePrice', 'sellingPrice', 'quantity'].includes(f)) {
          updates[f as keyof Product] = Number(req.body[f]) as any;
        } else {
          updates[f as keyof Product] = req.body[f];
        }
      }
    }

    const updated = await db.products.update(req.params.id, updates, branch);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete product from inventory (Requires inventory permission)
router.delete('/:id', authenticate, requirePermission('inventory'), async (req: Request, res: Response) => {
  const branch = req.headers['x-branch'] as string || req.query.branch as string;
  try {
    const deleted = await db.products.delete(req.params.id, branch);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Product successfully deleted from inventory.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
