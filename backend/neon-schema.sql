-- PostgreSQL Schema for Booking Application
-- Converted from MySQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (role IN ('admin', 'frontdesk'))
);

-- Room Types table
CREATE TABLE IF NOT EXISTS room_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  base_capacity INTEGER NOT NULL,
  max_capacity INTEGER NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  extra_guest_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (base_capacity > 0),
  CHECK (max_capacity >= base_capacity),
  CHECK (base_price >= 0),
  CHECK (extra_guest_fee >= 0)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON UPDATE CASCADE,
  room_number VARCHAR(50) NOT NULL UNIQUE,
  room_name VARCHAR(150) NOT NULL,
  description TEXT,
  floor_label VARCHAR(50),
  max_guests_override INTEGER,
  price_override DECIMAL(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (price_override IS NULL OR price_override >= 0),
  CHECK (max_guests_override IS NULL OR max_guests_override > 0),
  CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'inactive'))
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status, is_active);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  address_line VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Philippines',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(last_name, first_name);

-- Promos table
CREATE TABLE IF NOT EXISTS promos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  promo_code VARCHAR(50) UNIQUE,
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  minimum_nights INTEGER NOT NULL DEFAULT 1,
  minimum_rooms INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CHECK (discount_value >= 0),
  CHECK (end_date >= start_date),
  CHECK (minimum_nights > 0),
  CHECK (minimum_rooms > 0)
);

CREATE INDEX IF NOT EXISTS idx_promos_active_dates ON promos(is_active, start_date, end_date);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  reservation_code VARCHAR(30) NOT NULL UNIQUE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON UPDATE CASCADE,
  promo_id INTEGER REFERENCES promos(id) ON DELETE SET NULL ON UPDATE CASCADE,
  booking_scope VARCHAR(50) NOT NULL DEFAULT 'single_room',
  booking_source VARCHAR(50) NOT NULL DEFAULT 'online',
  arrival_type VARCHAR(50) NOT NULL DEFAULT 'advance',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  adult_count INTEGER NOT NULL DEFAULT 1,
  child_count INTEGER NOT NULL DEFAULT 0,
  special_requests TEXT,
  booking_notes TEXT,
  reservation_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  confirmation_code VARCHAR(40),
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  extra_charges_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (booking_scope IN ('single_room', 'multi_room', 'whole_resort')),
  CHECK (booking_source IN ('online', 'walk_in', 'phone', 'frontdesk_assisted')),
  CHECK (arrival_type IN ('same_day', 'advance')),
  CHECK (check_out_date > check_in_date),
  CHECK (adult_count >= 1),
  CHECK (child_count >= 0),
  CHECK (reservation_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'overstayed')),
  CHECK (payment_status IN ('pending', 'partial', 'paid', 'failed', 'refunded', 'cancelled')),
  CHECK (subtotal_amount >= 0),
  CHECK (discount_amount >= 0),
  CHECK (extra_charges_amount >= 0),
  CHECK (refund_amount >= 0),
  CHECK (total_amount >= 0),
  CHECK (amount_paid >= 0),
  CHECK (balance_due >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_confirmation_code ON reservations(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(reservation_status, payment_status);

-- Reservation Rooms (join table)
CREATE TABLE IF NOT EXISTS reservation_rooms (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE,
  nightly_rate DECIMAL(10,2) NOT NULL,
  nights INTEGER NOT NULL,
  adult_count INTEGER NOT NULL DEFAULT 1,
  child_count INTEGER NOT NULL DEFAULT 0,
  extra_guest_count INTEGER NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  room_status VARCHAR(50) NOT NULL DEFAULT 'reserved',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (reservation_id, room_id),
  CHECK (room_status IN ('reserved', 'checked_in', 'checked_out', 'cancelled', 'transferred')),
  CHECK (nightly_rate >= 0),
  CHECK (nights > 0),
  CHECK (adult_count >= 1),
  CHECK (child_count >= 0),
  CHECK (extra_guest_count >= 0),
  CHECK (line_total >= 0),
  CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_room_dates ON reservation_rooms(room_id, check_in_date, check_out_date);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  payment_channel VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reference_number VARCHAR(100),
  proof_image_url VARCHAR(255),
  paid_at TIMESTAMP,
  recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (payment_method IN ('e_wallet', 'bank_transfer', 'cash')),
  CHECK (payment_status IN ('pending', 'paid', 'partial', 'failed', 'refunded', 'cancelled')),
  CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id, payment_status);

-- Refund Requests table
CREATE TABLE IF NOT EXISTS refund_requests (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reason TEXT NOT NULL,
  request_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  requested_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  CHECK (request_status IN ('pending', 'approved', 'denied', 'processed')),
  CHECK (requested_amount >= 0),
  CHECK (approved_amount IS NULL OR approved_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(request_status);

-- Cancellation Requests table
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  requested_by VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  request_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  CHECK (requested_by IN ('guest', 'frontdesk', 'admin')),
  CHECK (request_status IN ('pending', 'approved', 'denied', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(request_status);

-- Stay Extensions table
CREATE TABLE IF NOT EXISTS stay_extensions (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  reservation_room_id INTEGER NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  current_check_out_date DATE NOT NULL,
  requested_check_out_date DATE NOT NULL,
  approved_check_out_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  additional_nights INTEGER,
  additional_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reason TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reviewed_at TIMESTAMP,
  notes TEXT,
  CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  CHECK (requested_check_out_date > current_check_out_date),
  CHECK (approved_check_out_date IS NULL OR approved_check_out_date > current_check_out_date),
  CHECK (additional_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stay_extensions_status ON stay_extensions(status);

-- Room Transfers table
CREATE TABLE IF NOT EXISTS room_transfers (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  reservation_room_id INTEGER NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  from_room_id INTEGER NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE,
  to_room_id INTEGER NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE,
  reason TEXT NOT NULL,
  transfer_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  effective_date DATE NOT NULL,
  additional_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  processed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  processed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (transfer_status IN ('pending', 'approved', 'completed', 'cancelled')),
  CHECK (additional_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_room_transfers_status ON room_transfers(transfer_status);

-- Reservation Charges table
CREATE TABLE IF NOT EXISTS reservation_charges (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  reservation_room_id INTEGER REFERENCES reservation_rooms(id) ON DELETE SET NULL ON UPDATE CASCADE,
  charge_type VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  charge_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (charge_type IN ('room_rate', 'extra_guest', 'extension', 'transfer_fee', 'damage', 'service', 'other')),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (amount >= 0)
);

-- Reservation Status History table
CREATE TABLE IF NOT EXISTS reservation_status_history (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  notes TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Room Images table
CREATE TABLE IF NOT EXISTS room_images (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Availability Blocks table
CREATE TABLE IF NOT EXISTS availability_blocks (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  block_scope VARCHAR(50) NOT NULL DEFAULT 'room',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (block_scope IN ('room', 'whole_resort')),
  CHECK (status IN ('active', 'lifted')),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_dates ON availability_blocks(start_date, end_date, status);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Amenities Cards table
CREATE TABLE IF NOT EXISTS amenities_cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Amenities Card Images table
CREATE TABLE IF NOT EXISTS amenities_card_images (
  id SERIAL PRIMARY KEY,
  amenities_card_id INTEGER NOT NULL REFERENCES amenities_cards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Amenities Content table
CREATE TABLE IF NOT EXISTS amenities_content (
  id SERIAL PRIMARY KEY,
  eyebrow VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(255),
  image_alt VARCHAR(255),
  subtitle TEXT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Homepage Slides table
CREATE TABLE IF NOT EXISTS homepage_slides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  subtitle TEXT,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  button_label VARCHAR(80),
  button_link VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Landing Content table
CREATE TABLE IF NOT EXISTS landing_content (
  id SERIAL PRIMARY KEY,
  eyebrow VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  primary_button_label VARCHAR(80) NOT NULL,
  primary_button_link VARCHAR(255) NOT NULL,
  secondary_button_label VARCHAR(80),
  secondary_button_link VARCHAR(255),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('pending', 'responded', 'closed'))
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  policy_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Reservation Holds table (for temp holds during booking)
CREATE TABLE IF NOT EXISTS reservation_holds (
  id SERIAL PRIMARY KEY,
  hold_token VARCHAR(80) NOT NULL UNIQUE,
  guest_email VARCHAR(150),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('active', 'converted', 'cancelled', 'expired')),
  CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_reservation_holds_window ON reservation_holds(check_in_date, check_out_date, status, expires_at);

-- Reservation Hold Rooms table
CREATE TABLE IF NOT EXISTS reservation_hold_rooms (
  id SERIAL PRIMARY KEY,
  hold_id INTEGER NOT NULL REFERENCES reservation_holds(id) ON DELETE CASCADE ON UPDATE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (hold_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_hold_rooms_room ON reservation_hold_rooms(room_id);

-- Schema Migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
