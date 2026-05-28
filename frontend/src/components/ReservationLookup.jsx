function ReservationLookup({
  lookupCode,
  lookupResult,
  onLookupCodeChange,
  onSubmit,
  formatPeso
}) {
  const latestPayment = Array.isArray(lookupResult?.payments) ? lookupResult.payments[0] : null;
  const computedPaymentStatus = (() => {
    const reservationStatus = lookupResult?.payment_status;

    if (!lookupResult) {
      return null;
    }

    // If the reservation is already paid/partial, that takes precedence.
    if (reservationStatus === 'paid' || reservationStatus === 'partial') {
      return reservationStatus;
    }

    // Otherwise, show the latest payment attempt status when available.
    if (latestPayment?.payment_status === 'failed') {
      return 'declined';
    }

    if (latestPayment?.payment_status) {
      return latestPayment.payment_status;
    }

    return reservationStatus || 'pending';
  })();

  return (
    <section className="panel">
      <div className="panel-header">
        <p className="eyebrow">Status Lookup</p>
        <h2>Reservation Check</h2>
        {/* <p>Fetch booking details using the reservation code endpoint.</p> */}
      </div>

      <form className="lookup-form" onSubmit={onSubmit}>
        <label>
          <span>Reservation code</span>
          <input
            value={lookupCode}
            onChange={onLookupCodeChange}
            placeholder="RES-123456789"
          />
        </label>
        <button type="submit" className="btn btn-secondary">Check Status</button>
      </form>

      <div className="lookup-result">
        {lookupResult?.error ? (
          lookupResult.error
        ) : lookupResult ? (
          <>
            <div><strong>Guest:</strong> {lookupResult.guest_name}</div>
            <div><strong>Confirmation:</strong> {lookupResult.confirmation_code || 'Pending full payment'}</div>
            <div><strong>Status:</strong> {lookupResult.reservation_status}</div>
            <div><strong>Payment:</strong> {computedPaymentStatus}</div>
            {computedPaymentStatus === 'declined' ? (
              <div><strong>Note:</strong> Your last submitted payment was declined. Please submit a new payment.</div>
            ) : null}
            <div><strong>Balance due:</strong> {formatPeso(lookupResult.balance_due)}</div>
          </>
        ) : (
          'No lookup yet.'
        )}
      </div>
    </section>
  );
}

export default ReservationLookup;
