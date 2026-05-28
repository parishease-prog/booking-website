import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvailableRooms from '../components/AvailableRooms.jsx';
import BookingForm from '../components/BookingForm.jsx';
import MessageBox from '../components/MessageBox.jsx';
import ReservationConfirmation from '../components/ReservationConfirmation.jsx';
import { apiGet, apiPost } from '../services/api.js';
import { formatPeso, isoDate } from '../utils/format.js';
import { validateEmail, validateText, validateOccupancy, sanitizeErrorMessage } from '../utils/validation.js';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  check_in_date: '',
  check_out_date: '',
  adult_count: 2,
  child_count: 0,
  special_requests: ''
};

function ReservePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [reservation, setReservation] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [todayMinDate, setTodayMinDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    setTodayMinDate(isoDate(today));

    setForm((current) => ({
      ...current,
      check_in_date: current.check_in_date || isoDate(today),
      check_out_date: current.check_out_date || isoDate(tomorrow)
    }));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === 'check_in_date' && next.check_out_date && next.check_out_date <= value) {
        const nextCheckout = new Date(value);
        nextCheckout.setDate(nextCheckout.getDate() + 1);
        next.check_out_date = isoDate(nextCheckout);
      }

      return next;
    });
  }

  function toggleRoom(roomId) {
    setSelectedRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId]
    );
  }

  async function handleAvailabilityCheck() {
    setMessage(null);
    setReservation(null);
    setSelectedRoomIds([]);

    if (!form.check_in_date || !form.check_out_date) {
      setMessage({ type: 'error', text: 'Please choose both dates first.' });
      return;
    }

    try {
      setLoadingAvailability(true);
      const rooms = await apiGet(
        `/available-rooms?check_in_date=${encodeURIComponent(form.check_in_date)}&check_out_date=${encodeURIComponent(form.check_out_date)}`
      );
      const normalizedRooms = Array.isArray(rooms) ? rooms : rooms.value || [];
      setAvailableRooms(normalizedRooms);
      setMessage({
        type: 'success',
        text: normalizedRooms.length
          ? 'Availability loaded. Select one or more rooms.'
          : 'No rooms are available for the selected dates.'
      });
    } catch (error) {
      setAvailableRooms([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoadingAvailability(false);
    }
  }

  const selectedRooms = availableRooms.filter((room) => selectedRoomIds.includes(room.id));
  const numberOfNights = form.check_in_date && form.check_out_date
    ? Math.max(
        Math.ceil((new Date(form.check_out_date) - new Date(form.check_in_date)) / (1000 * 60 * 60 * 24)),
        0
      )
    : 0;
  const estimatedTotal = selectedRooms.reduce(
    (sum, room) => sum + Number(room.effective_price || 0) * numberOfNights,
    0
  );
  const canSubmitReservation =
    !!form.first_name &&
    !!form.last_name &&
    !!form.email &&
    !!form.check_in_date &&
    !!form.check_out_date &&
    selectedRoomIds.length > 0 &&
    !submittingReservation;

  async function handleReservationSubmit(event) {
    event.preventDefault();
    setMessage(null);

    if (!selectedRoomIds.length) {
      setMessage({ type: 'error', text: 'Select at least one available room before submitting.' });
      return;
    }

    // Validate inputs
    if (!validateText(form.first_name, 100)) {
      setMessage({ type: 'error', text: 'First name is required (max 100 characters).' });
      return;
    }

    if (!validateText(form.last_name, 100)) {
      setMessage({ type: 'error', text: 'Last name is required (max 100 characters).' });
      return;
    }

    if (!validateEmail(form.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (form.special_requests && !validateText(form.special_requests, 500)) {
      setMessage({ type: 'error', text: 'Special requests must be less than 500 characters.' });
      return;
    }

    // Validate occupancy for each selected room
    for (const room of selectedRooms) {
      const occupancyError = validateOccupancy(
        Number(form.adult_count || 0),
        Number(form.child_count || 0),
        room.base_capacity,
        room.max_capacity
      );
      if (occupancyError) {
        setMessage({ type: 'error', text: `Room issue: ${occupancyError}` });
        return;
      }
    }

    const payload = {
      ...form,
      adult_count: Number(form.adult_count || 1),
      child_count: Number(form.child_count || 0),
      room_ids: selectedRoomIds
    };

    try {
      setSubmittingReservation(true);
      const hold = await apiPost('/reservation-holds', {
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        room_ids: selectedRoomIds,
        guest_email: form.email
      });

      const created = await apiPost('/reservations', {
        ...payload,
        hold_token: hold.hold_token
      });
      const details = await apiGet(`/reservations/code/${encodeURIComponent(created.reservation_code)}`);
      setReservation(details);
      setMessage({ type: 'success', text: `Reservation created. Code: ${created.reservation_code}` });
      
      // Redirect to booking success page after a short delay to show the success message
      setTimeout(() => {
        navigate(`/booking-success/${encodeURIComponent(created.reservation_code)}`);
      }, 1500);
    } catch (error) {
      const isDev = import.meta.env.DEV;
      setMessage({ type: 'error', text: sanitizeErrorMessage(error, isDev) });
    } finally {
      setSubmittingReservation(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel booking-panel">
        <div className="panel-header">
          <p className="eyebrow">Reserve</p>
          <h1 className="page-title">Reservation Form</h1>
          <p>Choose dates, check availability, and submit an online reservation.</p>
        </div>

        <BookingForm
          form={form}
          todayMinDate={todayMinDate}
          loadingAvailability={loadingAvailability}
          submittingReservation={submittingReservation}
          canSubmitReservation={canSubmitReservation}
          onFieldChange={updateField}
          onAvailabilityCheck={handleAvailabilityCheck}
          onSubmit={handleReservationSubmit}
        />

        <MessageBox message={message} />

        <AvailableRooms
          availableRooms={availableRooms}
          selectedRoomIds={selectedRoomIds}
          selectedRooms={selectedRooms}
          numberOfNights={numberOfNights}
          estimatedTotal={estimatedTotal}
          onToggleRoom={toggleRoom}
          formatPeso={formatPeso}
        />

        <ReservationConfirmation reservation={reservation} formatPeso={formatPeso} />

        {reservation?.reservation_code ? (
          <div className="action-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/payment?code=${encodeURIComponent(reservation.reservation_code)}`)}
            >
              Continue to Payment
            </button>
          </div>
        ) : null}
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Before You Submit</p>
            <h2>Booking reminders</h2>
          </div>
          <div className="summary-card">
            <div><strong>1.</strong> Check dates first to load available rooms.</div>
            <div><strong>2.</strong> Select at least one room before submitting.</div>
            <div><strong>3.</strong> Save your reservation code after booking.</div>
          </div>
        </section>
      </aside>
    </main>
  );
}

export default ReservePage;
