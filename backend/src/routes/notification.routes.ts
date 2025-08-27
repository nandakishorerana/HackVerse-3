import express from 'express';
import { protect } from '@/middleware/auth.middleware';

const router = express.Router();

// Placeholder routes - implement notification controller later
router.get('/', protect, (req, res) => {
  res.json({ message: 'Get user notifications - Coming Soon!' });
});

router.put('/:id/read', protect, (req, res) => {
  res.json({ message: `Mark notification ${req.params.id} as read - Coming Soon!` });
});

router.delete('/:id', protect, (req, res) => {
  res.json({ message: `Delete notification ${req.params.id} - Coming Soon!` });
});

export default router;
