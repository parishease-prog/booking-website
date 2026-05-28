// Vercel Serverless Function handler
const express = require('express');
const app = express();

console.log('[API] Handler initialized');

app.get('/', (req, res) => {
  console.log('[API] GET / called');
  res.json({ message: 'Booking Backend API is working!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

module.exports = app;


