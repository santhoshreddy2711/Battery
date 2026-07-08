import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// @route   GET /api/settings
// @desc    Get shop settings
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const settings = await db.settings.get();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/settings
// @desc    Update shop settings (Requires admin role)
router.put('/', authenticate, async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin credentials required to modify business details.' });
  }

  try {
    const updated = await db.settings.update(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/settings/credentials
// @desc    Change password or email for the currently logged in user
router.put('/credentials', authenticate, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  const { email, name, password, currentPassword } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await db.users.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify current password if password change is requested
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Please provide current password to authorize changes.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      // Check if email already in use
      const existing = await db.users.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email address already in use by another user.' });
      }
      updates.email = email;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await db.users.update(userId, updates);
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update credentials.' });
    }

    res.json({
      message: 'Credentials updated successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        permissions: updatedUser.permissions
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
