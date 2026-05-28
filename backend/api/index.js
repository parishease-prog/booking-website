// Vercel Serverless Function handler
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

console.log('[API] Handler initialized');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic routes
app.get('/', (req, res) => {
  console.log('[API] GET / called');
  res.json({ message: 'Booking Backend API is working!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import all route modules
try {
  const catalogRoutes = require('../src/routes/catalog.routes');
  const availabilityRoutes = require('../src/routes/availability.routes');
  const guestRoutes = require('../src/routes/guest.routes');
  const reservationRoutes = require('../src/routes/reservation.routes');
  const paymentRoutes = require('../src/routes/payment.routes');
  const requestRoutes = require('../src/routes/request.routes');
  const adminAuthRoutes = require('../src/routes/adminAuth.routes');
  const homepageSlideRoutes = require('../src/routes/homepageSlide.routes');
  const landingContentRoutes = require('../src/routes/landingContent.routes');
  const amenitiesContentRoutes = require('../src/routes/amenitiesContent.routes');
  const amenitiesCardRoutes = require('../src/routes/amenitiesCard.routes');
  const adminRoomRoutes = require('../src/routes/adminRoom.routes');
  const uploadRoutes = require('../src/routes/upload.routes');
  const adminOpsRoutes = require('../src/routes/adminOps.routes');
  const reportRoutes = require('../src/routes/report.routes');
  const inquiryRoutes = require('../src/routes/inquiry.routes');

  // Use routes
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

  console.log('[API] Routes loaded successfully');
} catch (err) {
  console.error('[API] Error loading routes:', err.message);
  console.error(err.stack);
}

// Error handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
});

module.exports = app;



