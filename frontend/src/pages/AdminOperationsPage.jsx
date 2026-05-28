import { useEffect, useMemo, useState } from 'react';
import MessageBox from '../components/MessageBox.jsx'
import DateFilter from '../components/DateFilter.jsx';
import ReportGenerator from '../components/ReportGenerator.jsx';
import { apiGet, apiPost } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';
import { formatPeso } from '../utils/format.js';

function AdminOperationsPage() {
  const token = getAdminToken();
  const [overview, setOverview] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  async function loadOperations() {
    try {
      setLoading(true);
      const [overviewData, logs] = await Promise.all([
        apiGet('/admin/operations/overview', { token }),
        apiGet('/admin/activity-logs?limit=80', { token })
      ]);

      setOverview(overviewData);
      setActivityLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      setOverview(null);
      setActivityLogs([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOperations().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredActivityLogs = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return activityLogs;
    }
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return activityLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= start && logDate < end;
    });
  }, [activityLogs, dateRange]);

  async function confirmReservation(reservationId) {
    try {
      setConfirmingId(reservationId);
      setMessage(null);
      await apiPost(`/admin/reservations/${reservationId}/confirm`, { notes: 'Confirmed from operations dashboard' }, { token });
      await loadOperations();
      setMessage({ type: 'success', text: 'Reservation confirmed successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Operations</p>
          <h1 className="page-title">Bookings Calendar and Status Board</h1>
          <p>Track arrivals, payment states, and manually confirm reservations when needed.</p>
        </div>

        <MessageBox message={message} />

        {loading ? (
          <div className="empty-state">Loading operations data...</div>
        ) : overview ? (
          <>
            <div className="summary-card">
              <div><strong>Window:</strong> {overview.window.from} to {overview.window.to}</div>
              <div><strong>Total reservations in window:</strong> {overview.reservations.length}</div>
            </div>

            <div className="summary-card">
              <div><strong>Reservation status summary</strong></div>
              {overview.status_summary?.length ? overview.status_summary.map((item) => (
                <div key={item.reservation_status}>{item.reservation_status}: {item.total}</div>
              )) : <div>No status summary available.</div>}
            </div>

            <div className="summary-card">
              <div><strong>Payment status summary</strong></div>
              {overview.payment_summary?.length ? overview.payment_summary.map((item) => (
                <div key={item.payment_status}>{item.payment_status}: {item.total}</div>
              )) : <div>No payment summary available.</div>}
            </div>

            <div className="summary-card">
              <div><strong>Daily arrivals</strong></div>
              {overview.daily_load?.length ? overview.daily_load.map((day) => (
                <div key={day.check_in_date}>{day.check_in_date}: {day.arrivals} arrivals ({day.active_reservations} active)</div>
              )) : <div>No arrivals in current window.</div>}
            </div>

            <div className="room-list">
              {overview.reservations?.map((reservation) => (
                <article key={reservation.id} className="room-card">
                  <header>
                    <div>
                      <h3>{reservation.reservation_code}</h3>
                      <p className="room-meta">{reservation.guest_name} | {reservation.guest_email}</p>
                    </div>
                    <span className="tag">{reservation.reservation_status}</span>
                  </header>
                  <p className="room-meta">
                    {String(reservation.check_in_date).slice(0, 10)} to {String(reservation.check_out_date).slice(0, 10)} | Payment: {reservation.payment_status}
                  </p>
                  <p className="room-meta">
                    Total: {formatPeso(reservation.total_amount)} | Balance: {formatPeso(reservation.balance_due)}
                  </p>

                  {reservation.reservation_status === 'pending' ? (
                    <div className="action-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => confirmReservation(reservation.id)}
                        disabled={confirmingId === reservation.id}
                      >
                        {confirmingId === reservation.id ? 'Confirming...' : 'Manual Confirm'}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}

        <ReportGenerator />
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Audit Trail</p>
            <h2>Recent activity</h2>
          </div>

          <DateFilter onDateRangeChange={setDateRange} />

          <div className={filteredActivityLogs.length ? 'room-list' : 'room-list empty-state'}>
            {filteredActivityLogs.length ? filteredActivityLogs.map((log) => (
              <article className="room-card" key={log.id}>
                <header>
                  <div>
                    <h3>{log.action}</h3>
                    <p className="room-meta">{log.entity_type} #{log.entity_id}</p>
                  </div>
                  <span className="tag">{log.user_name || 'system'}</span>
                </header>
                <p className="room-meta">{log.description || 'No description'}</p>
                <p className="room-meta">{new Date(log.created_at).toLocaleString()}</p>
              </article>
            )) : 'No activity logs found.'}
          </div>
        </section>
      </aside>
    </main>
  );
}

export default AdminOperationsPage;
