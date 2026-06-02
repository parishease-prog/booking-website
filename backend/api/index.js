// Vercel Serverless Function handler - with mock fallback
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Capture any require-time error when loading real routes so we can surface it
let realRoutesErrorStack = null;
console.log('[API] Handler initialized');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import real routes
try {
  const adminAuthRoutes = require('../src/routes/adminAuth.routes');
  const catalogRoutes = require('../src/routes/catalog.routes');
  const availabilityRoutes = require('../src/routes/availability.routes');
  const guestRoutes = require('../src/routes/guest.routes');
  const reservationRoutes = require('../src/routes/reservation.routes');
  const paymentRoutes = require('../src/routes/payment.routes');
  const requestRoutes = require('../src/routes/request.routes');
  const homepageSlideRoutes = require('../src/routes/homepageSlide.routes');
  const landingContentRoutes = require('../src/routes/landingContent.routes');
  const amenitiesContentRoutes = require('../src/routes/amenitiesContent.routes');
  const amenitiesCardRoutes = require('../src/routes/amenitiesCard.routes');
  const adminRoomRoutes = require('../src/routes/adminRoom.routes');
  const uploadRoutes = require('../src/routes/upload.routes');
  const adminOpsRoutes = require('../src/routes/adminOps.routes');
  const reportRoutes = require('../src/routes/report.routes');
  const inquiryRoutes = require('../src/routes/inquiry.routes');
  
  // Import security middleware
  const { attachCSRFToken, validateCSRFToken } = require('../src/middlewares/csrf.middleware');
  
  // Apply security middleware
  app.use(attachCSRFToken);
  app.use(validateCSRFToken);
  
  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  // Register real routes
  app.use(adminAuthRoutes);
  app.use(catalogRoutes);
  app.use(availabilityRoutes);
  app.use(guestRoutes);
  app.use(reservationRoutes);
  app.use(paymentRoutes);
  app.use(requestRoutes);
  app.use(homepageSlideRoutes);
  app.use(landingContentRoutes);
  app.use(amenitiesContentRoutes);
  app.use(amenitiesCardRoutes);
  app.use(adminRoomRoutes);
  app.use(uploadRoutes);
  app.use(adminOpsRoutes);
  app.use(reportRoutes);
  app.use(inquiryRoutes);
  
  console.log('[API] Real database routes loaded successfully');
} catch (err) {
  console.error('[API] Failed to load real routes:', err.message);
  console.error('[API] Real routes load stack:', err.stack || err);
  realRoutesErrorStack = err.stack || String(err);
  console.log('[API] Falling back to mock endpoints only');
}

// Basic routes
app.get('/', (req, res) => {
  console.log('[API] GET / called');
  // If requested, return the real-routes load stack for debugging (safe when SHOW_STACK=1)
  const showStack = req.query.showStack === '1' || process.env.SHOW_STACK === '1';
  if (showStack && realRoutesErrorStack) {
    return res.status(500).json({ error: 'Real routes failed to load', stack: realRoutesErrorStack });
  }

  res.json({ message: 'Booking Backend API is working!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock data for testing
const mockRooms = [
  { id: 1, room_number: '101', name: 'Deluxe Suite', room_type_id: 1, price_per_night: 150, capacity: 2, is_active: 1 },
  { id: 2, room_number: '102', name: 'Ocean View', room_type_id: 1, price_per_night: 200, capacity: 2, is_active: 1 },
  { id: 3, room_number: '201', name: 'Family Room', room_type_id: 2, price_per_night: 250, capacity: 4, is_active: 1 }
];

const mockAmenities = [
  { id: 1, title: 'Pool Access', description: 'Enjoy our Olympic-sized swimming pool', is_active: 1 },
  { id: 2, title: 'Spa Services', description: 'Relax with our world-class spa', is_active: 1 },
  { id: 3, title: 'Restaurant', description: 'Fine dining restaurant on-site', is_active: 1 }
];

const mockAmenitiesContent = {
  eyebrow: 'Amenities',
  title: 'What do we have to offer? A lot.',
  subtitle: 'World-class service and facilities'
};

// Mock endpoints for rooms (all variations)
app.get('/api/rooms', (req, res) => {
  console.log('[API] GET /api/rooms (MOCK)');
  res.json(mockRooms);
});

app.get('/api/catalog/rooms', (req, res) => {
  console.log('[API] GET /api/catalog/rooms (MOCK)');
  res.json(mockRooms);
});

// Mock endpoints for amenities (all variations)
app.get('/api/amenities-cards', (req, res) => {
  console.log('[API] GET /api/amenities-cards (MOCK)');
  res.json(mockAmenities);
});

app.get('/api/amenities-content', (req, res) => {
  console.log('[API] GET /api/amenities-content (MOCK)');
  res.json(mockAmenitiesContent);
});

// Mock admin endpoints
app.get('/api/admin/amenities-content', (req, res) => {
  console.log('[API] GET /api/admin/amenities-content (MOCK)');
  res.json(mockAmenitiesContent);
});

app.put('/api/admin/amenities-content', (req, res) => {
  console.log('[API] PUT /api/admin/amenities-content (MOCK)');
  res.json({ success: true, data: mockAmenitiesContent });
});

app.get('/api/admin/operations/overview', (req, res) => {
  console.log('[API] GET /api/admin/operations/overview (MOCK)');
  res.json({
    totalReservations: 0,
    totalRevenue: 0,
    activeBookings: 0,
    totalGuests: 0
  });
});

app.get('/api/admin/activity-logs', (req, res) => {
  console.log('[API] GET /api/admin/activity-logs (MOCK)');
  res.json([]);
});

// Mock inquiries endpoint
app.get('/api/inquiries', (req, res) => {
  console.log('[API] GET /api/inquiries (MOCK)');
  res.json([]);
});

app.get('/api/inquiries/:id', (req, res) => {
  console.log('[API] GET /api/inquiries/:id (MOCK)');
  res.json({ id: req.params.id, message: 'Mock inquiry' });
});

app.delete('/api/inquiries/:id', (req, res) => {
  console.log('[API] DELETE /api/inquiries/:id (MOCK)');
  res.json({ success: true });
});

app.patch('/api/inquiries/:id', (req, res) => {
  console.log('[API] PATCH /api/inquiries/:id (MOCK)');
  res.json({ success: true });
});

// Catch-all 404 handler
app.use((req, res) => {
  console.log('[API] 404 - Route not found:', req.method, req.url);
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.url, 
    message: 'This endpoint does not exist. Please check the API documentation.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
});

module.exports = app;




