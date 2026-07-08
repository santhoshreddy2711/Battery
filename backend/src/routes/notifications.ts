import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/notifications
// @desc    Get all notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const list = await db.notifications.find();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/notifications/:id
// @desc    Mark a notification as read
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const updated = await db.notifications.update(req.params.id, { read: true });
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
