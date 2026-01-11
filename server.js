const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { populateSampleData } = require('./populate-sample-data');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files (admin dashboard)
// app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', routes);

// Sample data population endpoint
app.get('/api/populate-sample-data', async (req, res) => {
  try {
    const result = await populateSampleData();
    res.json(result);
  } catch (error) {
    console.error('Populate data error:', error);
    res.status(500).json({ error: 'Failed to populate sample data', details: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'OurDailyScripture API',
    version: '1.0.0-beta',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      initDb: '/api/init-db',
      populateData: '/api/populate-sample-data'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  OurDailyScripture API Server Running      ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                              
║  Environment: ${process.env.NODE_ENV || 'development'}
║                                            ║
║  Endpoints:                                ║
║  - Health: http://localhost:${PORT}/api/health
║  - API: http://localhost:${PORT}/api       
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
