const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

console.log('[SERVER] Minimal server starting...');

app.get('/', (req, res) => {
  console.log('[SERVER] GET / called');
  res.json({ message: 'API is working', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

process.on('error', (err) => {
  console.error('[SERVER] FATAL ERROR:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});
