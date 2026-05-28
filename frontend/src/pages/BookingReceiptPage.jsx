import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageBox from '../components/MessageBox.jsx';
import { apiPost } from '../services/api.js';
import { formatPeso } from '../utils/format.js';
import { sanitizeErrorMessage } from '../utils/validation.js';
import { downloadBookingConfirmationPDF } from '../utils/pdf.js';

function BookingReceiptPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadReceipt() {
      // Get email from sessionStorage (set when navigating from MyBookingsPage)
      const email = sessionStorage.getItem('booking_email') || '';
      
      if (!email.trim()) {
        setMessage({ type: 'error', text: 'Email is required to load receipt. Please use the My Bookings page to access receipts.' });
        return;
      }

      try {
        // Use POST to avoid exposing email in URL
        const data = await apiPost(`/my-bookings/${encodeURIComponent(code)}/receipt`, { email: email.trim() });
        setReceipt(data);
      } catch (error) {
        const isDev = import.meta.env.DEV;
        setMessage({ type: 'error', text: sanitizeErrorMessage(error, isDev) });
      }
    }

    loadReceipt().catch(() => {});
  }, [code]);

  const totals = useMemo(() => {
    if (!receipt?.reservation) {
      return null;
    }

    return {
      total: Number(receipt.reservation.total_amount || 0),
      paid: Number(receipt.reservation.amount_paid || 0),
      balance: Number(receipt.reservation.balance_due || 0)
    };
  }, [receipt]);

  function downloadJson() {
    if (!receipt) {
      return;
    }

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${receipt.reservation.reservation_code}-receipt.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!receipt?.reservation) {
      return;
    }

    try {
      setDownloading(true);
      downloadBookingConfirmationPDF(receipt.reservation);
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
          <p className="eyebrow">Receipt</p>
          <h1 className="page-title">Booking Receipt</h1>
          <p>Use print or download to keep a copy of this reservation record.</p>
        </div>

        <MessageBox message={message} />

        {receipt ? (
          <>
            <div className="summary-card">
              <div><strong>Reservation code:</strong> {receipt.reservation.reservation_code}</div>
              <div><strong>Confirmation code:</strong> {receipt.reservation.confirmation_code || 'Pending full payment'}</div>
              <div><strong>Guest:</strong> {receipt.reservation.guest_name}</div>
              <div><strong>Email:</strong> {receipt.reservation.guest_email}</div>
              <div><strong>Stay:</strong> {String(receipt.reservation.check_in_date).slice(0, 10)} to {String(receipt.reservation.check_out_date).slice(0, 10)}</div>
            </div>

            <div className="summary-card">
              <div><strong>Room charges</strong></div>
              {receipt.room_charges?.length ? receipt.room_charges.map((line, index) => (
                <div key={`${line.item}-${index}`}>
                  {line.item} | {line.nights} nights x {formatPeso(line.unit_price)} = {formatPeso(line.amount)}
                </div>
              )) : <div>No room charges found.</div>}
            </div>

            <div className="summary-card">
              <div><strong>Payment history</strong></div>
              {receipt.payments?.length ? receipt.payments.map((payment, index) => (
                <div key={`${payment.reference_number || payment.paid_at}-${index}`}>
                  {payment.payment_status} | {formatPeso(payment.amount)} | {payment.payment_method} | {payment.reference_number || 'No reference'}
                </div>
              )) : <div>No payments found.</div>}
            </div>

            <div className="summary-card">
              <div><strong>Total:</strong> {formatPeso(totals.total)}</div>
              <div><strong>Paid:</strong> {formatPeso(totals.paid)}</div>
              <div><strong>Balance:</strong> {formatPeso(totals.balance)}</div>
            </div>

            <div className="action-row">
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                Print Receipt
              </button>
              <button type="button" className="btn btn-secondary" onClick={downloadPDF} disabled={downloading}>
                {downloading ? 'Generating PDF...' : '📄 Download PDF'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={downloadJson}>
                Download JSON
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default BookingReceiptPage;
