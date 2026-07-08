import { Router, Request, Response } from 'express';
import { db, Customer } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/customers
// @desc    Get all customers
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const customers = await db.customers.find();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer by ID or Mobile
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const customer = await db.customers.findOne({ id: req.params.id });
    if (!customer) {
      // check by mobile
      const customerByMobile = await db.customers.findOne({ mobile: req.params.id });
      if (!customerByMobile) {
        return res.status(404).json({ message: 'Customer not found.' });
      }
      return res.json(customerByMobile);
    }
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/customers
// @desc    Add a new customer
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { name, mobile, address, vehicleNumber } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile number are required.' });
  }

  try {
    const existing = await db.customers.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ message: 'Customer with this mobile number already exists.' });
    }

    const newCustomer: Customer = {
      id: 'cust_' + Date.now(),
      name,
      mobile,
      address: address || '',
      vehicleNumber: vehicleNumber || '',
      loyaltyPoints: 0,
      installationHistory: [],
      serviceRecords: []
    };

    const saved = await db.customers.create(newCustomer);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/customers/:id/service
// @desc    Add service record for a customer's vehicle
router.post('/:id/service', authenticate, async (req: Request, res: Response) => {
  const { description, vehicleNumber } = req.body;
  if (!description) {
    return res.status(400).json({ message: 'Service description is required.' });
  }

  try {
    const customer = await db.customers.findOne({ id: req.params.id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const record = {
      date: new Date().toISOString().split('T')[0],
      description,
      vehicleNumber: vehicleNumber || customer.vehicleNumber
    };

    const serviceRecords = [...customer.serviceRecords, record];
    const updated = await db.customers.update(customer.id, { serviceRecords });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer details
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const customer = await db.customers.findOne({ id: req.params.id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const updates: Partial<Customer> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.mobile !== undefined) updates.mobile = req.body.mobile;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.vehicleNumber !== undefined) updates.vehicleNumber = req.body.vehicleNumber;
    if (req.body.loyaltyPoints !== undefined) updates.loyaltyPoints = Number(req.body.loyaltyPoints);

    const updated = await db.customers.update(customer.id, updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
