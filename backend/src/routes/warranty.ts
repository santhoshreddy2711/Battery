import { Router, Request, Response } from 'express';
import { db, Warranty, WarrantyClaim } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/warranty
// @desc    Get all warranty certificates
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const warranties = await db.warranties.find();
    
    // Automatically update Expired status based on current date
    const today = new Date().toISOString().split('T')[0];
    let updatedWarranties = false;

    for (const w of warranties) {
      if (w.claimStatus === 'Active' && w.expiryDate < today) {
        w.claimStatus = 'Expired';
        await db.warranties.update(w.warrantyId, { claimStatus: 'Expired' });
        updatedWarranties = true;
      }
    }

    const finalWarranties = updatedWarranties ? await db.warranties.find() : warranties;
    res.json(finalWarranties);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   GET /api/warranty/:search
// @desc    Search warranty by ID or Mobile
router.get('/:search', authenticate, async (req: Request, res: Response) => {
  try {
    const { search } = req.params;
    const warranties = await db.warranties.find();
    
    const matched = warranties.filter(w => 
      w.warrantyId.toLowerCase() === search.toLowerCase() ||
      w.customerMobile === search ||
      w.customerName.toLowerCase().includes(search.toLowerCase())
    );

    res.json(matched);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/warranty/:warrantyId/claim
// @desc    File a new warranty claim
router.post('/:warrantyId/claim', authenticate, async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: 'Please specify the reason for the claim.' });
  }

  try {
    const warranty = await db.warranties.findOne({ warrantyId: req.params.warrantyId });
    if (!warranty) {
      return res.status(404).json({ message: 'Warranty certificate not found.' });
    }

    if (warranty.claimStatus === 'Expired') {
      return res.status(400).json({ message: 'Cannot file claim: Warranty has expired.' });
    }

    const newClaim: WarrantyClaim = {
      date: new Date().toISOString().split('T')[0],
      reason,
      status: 'Pending'
    };

    const updatedClaims = [...warranty.claims, newClaim];
    const updated = await db.warranties.update(warranty.warrantyId, {
      claims: updatedClaims,
      claimStatus: 'Active' // stays active while claim is pending
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/warranty/:warrantyId/claim/:index
// @desc    Approve/Reject a warranty claim (Requires admin or staff)
router.put('/:warrantyId/claim/:index', authenticate, async (req: Request, res: Response) => {
  const { status } = req.body; // 'Approved' | 'Rejected'
  const index = parseInt(req.params.index);

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Please specify status as Approved or Rejected.' });
  }

  try {
    const warranty = await db.warranties.findOne({ warrantyId: req.params.warrantyId });
    if (!warranty) {
      return res.status(404).json({ message: 'Warranty certificate not found.' });
    }

    if (isNaN(index) || index < 0 || index >= warranty.claims.length) {
      return res.status(400).json({ message: 'Invalid claim index.' });
    }

    warranty.claims[index].status = status;
    
    // If approved, update overall status
    let nextStatus = warranty.claimStatus;
    if (status === 'Approved') {
      nextStatus = 'Claimed';
    }

    const updated = await db.warranties.update(warranty.warrantyId, {
      claims: warranty.claims,
      claimStatus: nextStatus
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
