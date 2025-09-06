import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Legal Advisor API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Detailed health check
router.get('/detailed', (req, res) => {
  res.json({
    success: true,
    message: 'Legal Advisor API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected', // placeholder
      python_ai: 'connected'  // placeholder
    }
  });
});

export default router;