// Vercel Serverless Function handler - with mock fallback
const express = require('express');
const cors = require('cors');
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

// Try to load real routes, fallback to mock if fail
// For now, skip real routes since database isn't accessible from Vercel Serverless
console.log('[API] Using mock endpoints only (database unavailable from Vercel Serverless)');

// Catch-all 404 handler
app.use((req, res) => {
  console.log('[API] 404 - Route not found:', req.method, req.url);
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.url, 
    message: 'This endpoint is not available in mock mode. Database connectivity required.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ error: err.message, code: 'INTERNAL_SERVER_ERROR' });
});

module.exports = app;




