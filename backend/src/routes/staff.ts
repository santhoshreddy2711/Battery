import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, User } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// @route   GET /api/staff
// @desc    Get all staff members (Admins only)
router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const users = await db.users.find();
    // Exclude password hashes from list for security
    const sanitized = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: u.permissions
    }));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST /api/staff
// @desc    Add new staff member (Admins only)
router.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, email, password, role, permissions } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please enter all fields.' });
  }

  try {
    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Staff email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newStaff: User = {
      id: 'usr_' + Date.now(),
      name,
      email,
      passwordHash,
      role: role || 'staff',
      permissions: permissions || ['billing', 'customers']
    };

    const saved = await db.users.create(newStaff);
    res.status(201).json({
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      permissions: saved.permissions
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   PUT /api/staff/:id
// @desc    Update staff details or permissions (Admins only)
router.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, email, role, permissions, password } = req.body;

  try {
    const user = await db.users.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates: Partial<User> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password, salt);
    }

    const updated = await db.users.update(req.params.id, updates);
    if (!updated) return res.status(404).json({ message: 'Error updating user.' });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      permissions: updated.permissions
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
