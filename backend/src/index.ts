import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db'; // init database connection

// Route Imports
import authRoutes from './routes/auth';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import billingRoutes from './routes/billing';
import warrantyRoutes from './routes/warranty';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import reportsRoutes from './routes/reports';
import staffRoutes from './routes/staff';
import settingsRoutes from './routes/settings';
import notificationsRoutes from './routes/notifications';

// Load config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow any origin for easy local testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch']
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mounting Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Database initialization & server start
async function startServer() {
  await initDB();
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Backend server successfully running on port ${PORT}`);
    });
  }
}

startServer();

export default app;
