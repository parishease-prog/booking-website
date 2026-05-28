const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./utils/initDatabase');

const catalogRoutes = require('./routes/catalog.routes');
const availabilityRoutes = require('./routes/availability.routes');
const guestRoutes = require('./routes/guest.routes');
const reservationRoutes = require('./routes/reservation.routes');
const paymentRoutes = require('./routes/payment.routes');
const requestRoutes = require('./routes/request.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const homepageSlideRoutes = require('./routes/homepageSlide.routes');
const landingContentRoutes = require('./routes/landingContent.routes');
const amenitiesContentRoutes = require('./routes/amenitiesContent.routes');
const amenitiesCardRoutes = require('./routes/amenitiesCard.routes');
const adminRoomRoutes = require('./routes/adminRoom.routes');
const uploadRoutes = require('./routes/upload.routes');
const adminOpsRoutes = require('./routes/adminOps.routes');
const reportRoutes = require('./routes/report.routes');
const inquiryRoutes = require('./routes/inquiry.routes');

// Import security middleware
const { attachCSRFToken, validateCSRFToken } = require('./middlewares/csrf.middleware');

// Import controller handlers for debug endpoints
const reservationController = require('./controllers/reservation.controller');
const paymentController = require('./controllers/payment.controller');

const app = express();
const frontendDir = path.resolve(__dirname, '../../frontend');
const uploadsDir = path.resolve(__dirname, '../uploads');

app.use(cors());

// CSRF token middleware - attach to all responses and validate on state-changing requests
app.use(attachCSRFToken);
app.use(validateCSRFToken);

// Security headers middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // HSTS (HTTP Strict Transport Security) - 1 year
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf?.toString('utf8') || '';
  }
}));
// Simple request logger to help debug routing and incoming payloads
app.use((req, res, next) => {
  try {
    const info = `[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} bodyLen=${req.headers['content-length'] || 0}`;
    console.log(info);
  } catch (err) {
    // ignore logging errors
  }
  next();
});

// Debug body logger for specific endpoints
app.use((req, res, next) => {
  try {
    if (req.originalUrl && (req.originalUrl.startsWith('/reservation-holds') || req.originalUrl.startsWith('/payments/webhooks'))) {
      console.log('[BODY DEBUG]', req.method, req.originalUrl, 'rawBodyLen=', (req.rawBody || '').length);
      try { console.log('[BODY DEBUG] rawBody:', req.rawBody); } catch (e) {}
      try { console.log('[BODY DEBUG] parsed body keys:', Object.keys(req.body || {}).join(',')); } catch (e) {}
    }
  } catch (err) {}
  next();
});
app.use('/app', express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

app.get('/app', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/app/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get(/^\/app\/.*/, (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/app/styles.css', (req, res) => {
  res.sendFile(path.join(frontendDir, 'styles.css'));
});

app.get('/app/app.js', (req, res) => {
  res.sendFile(path.join(frontendDir, 'app.js'));
});

app.get('/', (req, res) => {
  res.json({ message: 'Booking API is running' });
});

app.use(catalogRoutes);
app.use(availabilityRoutes);
app.use(guestRoutes);
app.use(reservationRoutes);
app.use(paymentRoutes);
app.use('/requests', requestRoutes);
app.use(adminAuthRoutes);
app.use(homepageSlideRoutes);
app.use(landingContentRoutes);
app.use(amenitiesContentRoutes);
app.use(amenitiesCardRoutes);
app.use(adminRoomRoutes);
app.use(uploadRoutes);
app.use(adminOpsRoutes);
app.use(reportRoutes);
app.use('/inquiries', inquiryRoutes);

// Temporary debug endpoints that call controller handlers directly
app.post('/__debug/reservation-holds', (req, res) => {
  return reservationController.createReservationHold(req, res);
});

app.post('/__debug/payments/webhooks/generic', (req, res) => {
  return paymentController.handlePaymentWebhook(req, res);
});

// Diagnostic: list registered routes (temporary)
app.get('/__routes', (req, res) => {
  try {
    const routes = [];
    const stack = app._router && app._router.stack ? app._router.stack : [];
    stack.forEach((layer, idx) => {
      try {
        routes.push({ index: idx, name: layer.name || null, hasRoute: Boolean(layer.route), path: layer.route ? layer.route.path : null });
      } catch (e) {
        routes.push({ index: idx, error: String(e) });
      }
    });
    res.json({ summary: `Found ${routes.length} layers`, layers: routes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  // Initialize database first, then start server
  initializeDatabase().then(success => {
    if (success) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } else {
      console.error('Database initialization failed, but server will attempt to start anyway');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (without database)`);
      });
    }
  });
}

module.exports = app;
