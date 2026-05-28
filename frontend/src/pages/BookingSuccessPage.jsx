import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MessageBox from '../components/MessageBox.jsx';
import { apiGet } from '../services/api.js';
import { formatPeso } from '../utils/format.js';
import { downloadBookingConfirmationPDF } from '../utils/pdf.js';

function BookingSuccessPage() {
  const { code } = useParams();
  const [reservation, setReservation] = useState(null);
  const [message, setMessage] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const details = await apiGet(`/reservations/code/${encodeURIComponent(code)}`);
        setReservation(details);
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      }
    }

    load().catch(() => {});
  }, [code]);

  function handleDownloadPDF() {
    if (!reservation) return;

    try {
      setDownloading(true);
      downloadBookingConfirmationPDF(reservation);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download PDF: ' + error.message });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Booking Complete</p>
          <h1 className="page-title">Reservation Summary</h1>
        </div>

        <MessageBox message={message} />

        {reservation ? (
          <div className="summary-card">
            <div><strong>Reservation code:</strong> {reservation.reservation_code}</div>
            <div><strong>Confirmation reference:</strong> {reservation.confirmation_code || 'Will be generated after full payment'}</div>
            <div><strong>Guest:</strong> {reservation.guest_name}</div>
            <div><strong>Stay:</strong> {String(reservation.check_in_date).slice(0, 10)} to {String(reservation.check_out_date).slice(0, 10)}</div>
            <div><strong>Status:</strong> {reservation.reservation_status}</div>
            <div><strong>Payment:</strong> {reservation.payment_status}</div>
            <div><strong>Total:</strong> {formatPeso(reservation.total_amount)}</div>
            <div><strong>Paid:</strong> {formatPeso(reservation.amount_paid)}</div>
            <div><strong>Balance:</strong> {formatPeso(reservation.balance_due)}</div>
          </div>
        ) : null}

        <div className="action-row">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleDownloadPDF}
            disabled={!reservation || downloading}
          >
            {downloading ? 'Downloading...' : '📥 Download Confirmation'}
          </button>
          <Link to="/my-bookings" className="btn btn-secondary">Manage My Bookings</Link>
          <Link to="/rooms" className="btn btn-secondary">Browse More Rooms</Link>
        </div>
      </section>
    </main>
  );
}

export default BookingSuccessPage;
