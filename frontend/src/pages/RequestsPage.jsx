import { useState } from 'react';
import MessageBox from '../components/MessageBox.jsx';
import { apiGet, apiPost } from '../services/api.js';
import { formatPeso } from '../utils/format.js';

const requestTypes = [
  { value: 'cancellation', label: 'Cancel Reservation' },
  { value: 'refund', label: 'Request Refund' },
  { value: 'extension', label: 'Extend Stay' }
];

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (error) {
    return String(value);
  }
}

function RequestsPage() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState('');
  const [form, setForm] = useState({
    reason: '',
    newCheckOutDate: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  async function loadBookings(event) {
    event.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Enter your email first.' });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const rows = await apiGet(`/my-bookings?email=${encodeURIComponent(trimmed)}`);
      setBookings(Array.isArray(rows) ? rows : []);
      if (Array.isArray(rows) && rows.length > 0) {
        setMessage({ type: 'success', text: 'Bookings loaded successfully.' });
      } else {
        setMessage({ type: 'error', text: 'No bookings found for this email.' });
      }
    } catch (error) {
      setBookings([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmitRequest(event) {
    event.preventDefault();

    if (!selectedBooking) {
      setMessage({ type: 'error', text: 'Please select a booking first.' });
      return;
    }

    if (!requestType) {
      setMessage({ type: 'error', text: 'Please select a request type.' });
      return;
    }

    if (!form.reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for your request.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      let endpoint = '';
      let payload = {};

      if (requestType === 'cancellation') {
        endpoint = '/requests/cancellation-requests';
        payload = {
          reservation_id: selectedBooking.id,
          requested_by: 'guest',
          reason: form.reason
        };
      } else if (requestType === 'refund') {
        endpoint = '/requests/refund-requests';
        payload = {
          reservation_id: selectedBooking.id,
          payment_id: null,
          reason: form.reason,
          requested_amount: selectedBooking.total_amount
        };
      } else if (requestType === 'extension') {
        if (!form.newCheckOutDate) {
          setMessage({ type: 'error', text: 'Please select a new check-out date.' });
          setSubmitting(false);
          return;
        }
        endpoint = '/requests/stay-extensions';
        payload = {
          reservation_id: selectedBooking.id,
          current_check_out_date: formatDate(selectedBooking.check_out_date),
          requested_check_out_date: form.newCheckOutDate,
          reason: form.reason
        };
      }

      await apiPost(endpoint, payload);

      setMessage({
        type: 'success',
        text: `Your ${requestTypes.find((t) => t.value === requestType)?.label.toLowerCase()} request has been submitted successfully. We will review it and contact you soon.`
      });

      setRequestType('');
      setForm({ reason: '', newCheckOutDate: '' });
      setSelectedBookingId(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Guest Services</p>
          <h1 className="page-title">Reservation Requests</h1>
          <p>Submit requests to cancel, modify, or extend your reservations.</p>
        </div>

        <form className="booking-form" onSubmit={loadBookings}>
          <label>
            <span>Email used during booking</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <div className="action-row">
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? 'Loading...' : 'Load My Bookings'}
            </button>
          </div>
        </form>

        <MessageBox message={message} />

        {bookings.length > 0 && (
          <>
            <div className="panel-header">
              <h2>Select a booking</h2>
            </div>

            <div className="room-list">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  className={`room-card${selectedBookingId === booking.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedBookingId(booking.id)}
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                >
                  <header>
                    <div>
                      <h3>{booking.reservation_code}</h3>
                      <p className="room-meta">
                        {formatDate(booking.check_in_date)} to {formatDate(booking.check_out_date)}
                      </p>
                    </div>
                    <span className="tag">{booking.reservation_status}</span>
                  </header>
                  <p className="room-meta">{formatPeso(booking.total_amount)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="sidebar">
        {selectedBooking ? (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Booking Summary</h2>
            </div>

            <div className="summary-card">
              <div><strong>Code:</strong> {selectedBooking.reservation_code}</div>
              <div><strong>Check-in:</strong> {formatDate(selectedBooking.check_in_date)}</div>
              <div><strong>Check-out:</strong> {formatDate(selectedBooking.check_out_date)}</div>
              <div><strong>Status:</strong> {selectedBooking.reservation_status}</div>
              <div><strong>Total:</strong> {formatPeso(selectedBooking.total_amount)}</div>
              <div><strong>Paid:</strong> {formatPeso(selectedBooking.amount_paid)}</div>
              <div><strong>Balance:</strong> {formatPeso(selectedBooking.balance_due)}</div>
            </div>

            <div className="panel-header">
              <h2>Submit a Request</h2>
            </div>

            <form className="booking-form" onSubmit={handleSubmitRequest}>
              <label>
                <span>Request Type</span>
                <select value={requestType} onChange={(e) => setRequestType(e.target.value)} required>
                  <option value="">Select a request type...</option>
                  {requestTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {requestType === 'refund' && (
                <div className="summary-card">
                  <div><strong>Refund Amount:</strong> {formatPeso(selectedBooking.total_amount)}</div>
                </div>
              )}

              {requestType === 'extension' && (
                <label>
                  <span>New Check-out Date</span>
                  <input
                    type="date"
                    name="newCheckOutDate"
                    value={form.newCheckOutDate}
                    onChange={updateField}
                    required
                  />
                </label>
              )}

              <label className="full-width">
                <span>Reason</span>
                <textarea
                  name="reason"
                  rows="3"
                  value={form.reason}
                  onChange={updateField}
                  placeholder="Please explain your request..."
                  required
                />
              </label>

              <div className="action-row">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Select a booking</h2>
            </div>
            <p className="room-meta">Click on a booking from the list to submit a request.</p>
          </section>
        )}
      </aside>
    </main>
  );
}

export default RequestsPage;
