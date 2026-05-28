import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MessageBox from '../components/MessageBox.jsx';
import { apiGet, apiPost, apiUploadFile } from '../services/api.js';
import { formatPeso } from '../utils/format.js';
import { validateFile, sanitizeErrorMessage } from '../utils/validation.js';

const initialForm = {
  payment_method: 'e_wallet',
  payment_channel: '',
  amount: '',
  reference_number: '',
  proof_image_url: '',
  notes: ''
};

function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lookupCode, setLookupCode] = useState('');
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    const codeFromQuery = String(searchParams.get('code') || '').trim();
    if (!codeFromQuery) {
      return;
    }

    setLookupCode(codeFromQuery);

    async function preloadReservation() {
      try {
        const details = await apiGet(`/reservations/code/${encodeURIComponent(codeFromQuery)}`);
        setReservation(details);
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      }
    }

    preloadReservation().catch(() => {});
  }, [searchParams]);

  const summary = useMemo(() => {
    if (!reservation) {
      return null;
    }

    const total = Number(reservation.total_amount || 0);
    const paid = Number(reservation.amount_paid || 0);
    const balance = Number(reservation.balance_due || Math.max(total - paid, 0));

    return { total, paid, balance };
  }, [reservation]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleLookup(event) {
    event.preventDefault();
    const code = lookupCode.trim();

    if (!code) {
      setMessage({ type: 'error', text: 'Enter your reservation code first.' });
      return;
    }

    setMessage(null);
    setLoadingLookup(true);

    try {
      const details = await apiGet(`/reservations/code/${encodeURIComponent(code)}`);
      setReservation(details);
      setMessage({ type: 'success', text: 'Reservation found. You can submit your payment details below.' });
    } catch (error) {
      setReservation(null);
      const isDev = import.meta.env.DEV;
      setMessage({ type: 'error', text: sanitizeErrorMessage(error, isDev) });
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!reservation?.id) {
      setMessage({ type: 'error', text: 'Look up a reservation code before submitting payment.' });
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Amount must be a positive number.' });
      return;
    }

      setMessage(null);

    try {
      setSubmitting(true);
      await apiPost('/payments/guest', {
        reservation_id: reservation.id,
        reservation_code: reservation.reservation_code,
        payment_method: form.payment_method,
        payment_channel: form.payment_channel || null,
        amount,
        reference_number: form.reference_number || null,
        proof_image_url: form.proof_image_url || null,
        notes: form.notes || null
      });

      const refreshed = await apiGet(`/reservations/code/${encodeURIComponent(reservation.reservation_code)}`);
      setReservation(refreshed);
      setForm(initialForm);

      if (refreshed.payment_status === 'paid') {
        navigate(`/booking-success/${encodeURIComponent(refreshed.reservation_code)}`);
        return;
      }

      setMessage({ type: 'success', text: 'Payment submitted. Waiting for verification.' });
    } catch (error) {
      const isDev = import.meta.env.DEV;
      setMessage({ type: 'error', text: sanitizeErrorMessage(error, isDev) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProofUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file before upload
    const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error });
      event.target.value = '';
      return;
    }

    try {
      setUploadingProof(true);
      setMessage(null);
      const uploaded = await apiUploadFile(file);
      setForm((current) => ({
        ...current,
        proof_image_url: uploaded.file_url || uploaded.file_path || ''
      }));
      setMessage({ type: 'success', text: 'Proof file uploaded successfully.' });
    } catch (error) {
      const isDev = import.meta.env.DEV;
      setMessage({ type: 'error', text: sanitizeErrorMessage(error, isDev) });
    } finally {
      setUploadingProof(false);
      event.target.value = '';
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Payment</p>
          <h1 className="page-title">Submit Payment</h1>
          <p>Enter your reservation code, review your balance, then submit your payment details.</p>
        </div>

        <form className="booking-form" onSubmit={handleLookup}>
          <label>
            <span>Reservation code</span>
            <input
              value={lookupCode}
              onChange={(event) => setLookupCode(event.target.value)}
              placeholder="RES-123456789"
            />
          </label>
          <div className="action-row">
            <button type="submit" className="btn btn-secondary" disabled={loadingLookup}>
              {loadingLookup ? 'Checking...' : 'Find Reservation'}
            </button>
          </div>
        </form>

        <MessageBox message={message} />

        {reservation ? (
          <>
            <div className="summary-card">
              <div><strong>Guest:</strong> {reservation.guest_name}</div>
              <div><strong>Reservation:</strong> {reservation.reservation_code}</div>
              <div><strong>Status:</strong> {reservation.reservation_status}</div>
              <div><strong>Payment:</strong> {reservation.payment_status}</div>
              <div><strong>Total:</strong> {formatPeso(summary.total)}</div>
              <div><strong>Paid:</strong> {formatPeso(summary.paid)}</div>
              <div><strong>Balance:</strong> {formatPeso(summary.balance)}</div>
            </div>

            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label>
                  <span>Payment method</span>
                  <select name="payment_method" value={form.payment_method} onChange={updateField}>
                    <option value="e_wallet">E-wallet</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash deposit</option>
                  </select>
                </label>
                <label>
                  <span>Channel (optional)</span>
                  <input
                    name="payment_channel"
                    value={form.payment_channel}
                    onChange={updateField}
                    placeholder="GCash, BPI, Maya, etc."
                  />
                </label>
              </div>

              <div className="field-grid">
                <label>
                  <span>Amount</span>
                  <input
                    name="amount"
                    value={form.amount}
                    onChange={updateField}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
                <label>
                  <span>Reference number (optional)</span>
                  <input
                    name="reference_number"
                    value={form.reference_number}
                    onChange={updateField}
                  />
                </label>
              </div>

              <label className="full-width">
                <span>Proof image URL (optional)</span>
                <input
                  name="proof_image_url"
                  value={form.proof_image_url}
                  onChange={updateField}
                  placeholder="https://..."
                />
              </label>

              <label className="full-width">
                <span>Upload proof file (image or PDF)</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleProofUpload} disabled={uploadingProof || submitting} />
              </label>

              {uploadingProof ? <div className="room-meta">Uploading proof file...</div> : null}

              <label className="full-width">
                <span>Notes (optional)</span>
                <textarea name="notes" rows="3" value={form.notes} onChange={updateField} />
              </label>

              <div className="action-row">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">How It Works</p>
            <h2>Payment reminders</h2>
          </div>
          <div className="summary-card">
            <div><strong>1.</strong> Enter your reservation code.</div>
            <div><strong>2.</strong> Submit your payment details.</div>
            <div><strong>3.</strong> Wait for payment verification.</div>
          </div>
        </section>
      </aside>
    </main>
  );
}

export default PaymentPage;
