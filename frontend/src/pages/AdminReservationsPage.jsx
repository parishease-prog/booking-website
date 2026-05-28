import { useEffect, useMemo, useState } from 'react';
import MessageBox from '../components/MessageBox.jsx';
import DateFilter from '../components/DateFilter.jsx';
import { apiGet, apiPatch } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';
import { formatPeso } from '../utils/format.js';
import { maskEmail } from '../utils/validation.js';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked-in' },
  { value: 'checked_out', label: 'Checked-out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
  { value: 'overstayed', label: 'Overstayed' }
];

function formatDate(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (error) {
    return String(value);
  }
}

function AdminReservationsPage() {
  const token = getAdminToken();
  const [reservations, setReservations] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [detailsMessage, setDetailsMessage] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [nextStatus, setNextStatus] = useState('pending');
  const [notes, setNotes] = useState('');

  async function loadReservations() {
    try {
      const data = await apiGet('/admin/reservations', { token });
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setReservations([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadReservations().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredReservations = useMemo(() => {
    let results = reservations;

    // Filter by date range
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      results = results.filter((res) => {
        const resDate = new Date(res.created_at);
        return resDate >= start && resDate < end;
      });
    }

    // Filter by search
    const q = search.trim().toLowerCase();
    if (!q) {
      return results;
    }

    return results.filter((reservation) => {
      const code = String(reservation.reservation_code || '').toLowerCase();
      const guest = String(reservation.guest_name || '').toLowerCase();
      const email = String(reservation.guest_email || '').toLowerCase();
      return code.includes(q) || guest.includes(q) || email.includes(q);
    });
  }, [reservations, search, dateRange]);

  async function loadReservationDetails(id) {
    if (!id) {
      setSelectedReservation(null);
      return;
    }

    try {
      setDetailsMessage(null);
      setLoadingDetails(true);
      const data = await apiGet(`/admin/reservations/${id}`, { token });
      setSelectedReservation(data);
      setNextStatus(data.reservation_status || 'pending');
      setNotes('');
    } catch (error) {
      setDetailsMessage({ type: 'error', text: error.message });
      setSelectedReservation(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleSelectReservation(id) {
    setSelectedId(id);
    await loadReservationDetails(id);
  }

  async function handleStatusUpdate(event) {
    event.preventDefault();
    if (!selectedId) {
      return;
    }

    setDetailsMessage(null);

    try {
      setSavingStatus(true);
      await apiPatch(
        `/admin/reservations/${selectedId}/status`,
        { status: nextStatus, notes },
        { token }
      );
      await Promise.all([loadReservations(), loadReservationDetails(selectedId)]);
      setDetailsMessage({ type: 'success', text: 'Reservation status updated.' });
      setNotes('');
    } catch (error) {
      setDetailsMessage({ type: 'error', text: error.message });
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Booking Management</p>
          <h1 className="page-title">Reservations</h1>
          <p>Review bookings, open details, and update reservation statuses.</p>
        </div>

        <label>
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code, guest name, or email"
          />
        </label>

        <DateFilter onDateRangeChange={setDateRange} />

        <MessageBox message={message} />

        <div className={filteredReservations.length ? 'room-list' : 'room-list empty-state'}>
          {loadingList ? 'Loading reservations...' : filteredReservations.length ? filteredReservations.map((reservation) => (
            <button
              key={reservation.id}
              type="button"
              className={`room-card reservation-list-item${reservation.id === selectedId ? ' is-active' : ''}`}
              onClick={() => handleSelectReservation(reservation.id)}
            >
              <header>
                <div>
                  <h3>{reservation.reservation_code}</h3>
                  <p className="room-meta">{reservation.guest_name} · {maskEmail(reservation.guest_email)}</p>
                </div>
                <span className="tag">{reservation.reservation_status}</span>
              </header>
              <p className="room-meta">
                {formatDate(reservation.check_in_date)} to {formatDate(reservation.check_out_date)} · Payment: {reservation.payment_status}
              </p>
              <p className="room-meta">
                Balance due: {formatPeso(reservation.balance_due)}
              </p>
            </button>
          )) : 'No reservations found.'}
        </div>
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Reservation Details</p>
            <h2>{selectedReservation ? selectedReservation.reservation_code : 'Select a reservation'}</h2>
          </div>

          {loadingDetails ? (
            <div className="empty-state">Loading reservation details...</div>
          ) : selectedReservation ? (
            <>
              <div className="summary-card">
                <div><strong>Guest:</strong> {selectedReservation.guest_name}</div>
                <div><strong>Email:</strong> {maskEmail(selectedReservation.guest_email)}</div>
                <div><strong>Phone:</strong> {selectedReservation.guest_phone || 'N/A'}</div>
                <div><strong>Dates:</strong> {formatDate(selectedReservation.check_in_date)} to {formatDate(selectedReservation.check_out_date)}</div>
                <div><strong>Status:</strong> {selectedReservation.reservation_status}</div>
                <div><strong>Payment:</strong> {selectedReservation.payment_status}</div>
                <div><strong>Total:</strong> {formatPeso(selectedReservation.total_amount)}</div>
                <div><strong>Paid:</strong> {formatPeso(selectedReservation.amount_paid)}</div>
                <div><strong>Balance:</strong> {formatPeso(selectedReservation.balance_due)}</div>
              </div>

              {selectedReservation.special_requests ? (
                <div className="summary-card">
                  <div><strong>Special requests:</strong></div>
                  <div>{selectedReservation.special_requests}</div>
                </div>
              ) : null}

              <div className="summary-card">
                <div><strong>Rooms:</strong></div>
                {selectedReservation.rooms?.length ? (
                  selectedReservation.rooms.map((room) => (
                    <div key={room.id}>
                      {room.room_type_name} {room.room_number} ({room.room_name}) · {formatPeso(room.nightly_rate)} x {room.nights}
                    </div>
                  ))
                ) : (
                  <div>No rooms found.</div>
                )}
              </div>

              <form className="booking-form" onSubmit={handleStatusUpdate}>
                <div className="field-grid">
                  <label>
                    <span>Update status</span>
                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Notes</span>
                    <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason or staff note" />
                  </label>
                </div>

                <div className="action-row">
                  <button type="submit" className="btn btn-primary" disabled={savingStatus}>
                    {savingStatus ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
              </form>

              <MessageBox message={detailsMessage} />
            </>
          ) : (
            <div className="empty-state">Choose a reservation from the list to view full details.</div>
          )}
        </section>
      </aside>
    </main>
  );
}

export default AdminReservationsPage;

