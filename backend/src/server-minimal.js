const express = require('express');
const app = express();

console.log('[SERVER] Minimal server starting...');

app.get('/', (req, res) => {
  console.log('[SERVER] GET / called');
  res.json({ message: 'API is working', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;

