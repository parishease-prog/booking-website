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

  const getStatusColor = (status) => {
    const colors = {
      confirmed: '#10b981',
      pending: '#f59e0b',
      completed: '#3b82f6',
      cancelled: '#ef4444',
      paid: '#10b981',
      pending_payment: '#f59e0b',
      partial: '#eab308'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getStatusBadgeClass = (status) => {
    const baseClass = 'badge-inline ';
    if (status?.includes('confirm')) return baseClass + 'badge-success';
    if (status?.includes('pending')) return baseClass + 'badge-warning';
    if (status?.includes('completed')) return baseClass + 'badge-info';
    if (status?.includes('cancel')) return baseClass + 'badge-danger';
    return baseClass + 'badge-default';
  };

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Operations</p>
          <h1 className="page-title">📊 Bookings Dashboard</h1>
          <p>Real-time overview of your reservations, payments, and arrivals.</p>
        </div>

        <MessageBox message={message} />

        {loading ? (
          <div className="empty-state">
            <p>🔄 Loading dashboard...</p>
          </div>
        ) : overview ? (
          <>
            {/* KPI Cards */}
            <div className="dashboard-grid">
              <div className="kpi-card">
                <div className="kpi-icon">📅</div>
                <div className="kpi-content">
                  <p className="kpi-label">Period</p>
                  <p className="kpi-value">{overview.window.from}</p>
                  <p className="kpi-subtext">to {overview.window.to}</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon">🎫</div>
                <div className="kpi-content">
                  <p className="kpi-label">Total Reservations</p>
                  <p className="kpi-value">{overview.reservations.length}</p>
                  <p className="kpi-subtext">this period</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon">💰</div>
                <div className="kpi-content">
                  <p className="kpi-label">Total Revenue</p>
                  <p className="kpi-value">{formatPeso(
                    overview.reservations.reduce((sum, r) => sum + (r.total_amount || 0), 0)
                  )}</p>
                  <p className="kpi-subtext">expected</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-content">
                  <p className="kpi-label">Pending Action</p>
                  <p className="kpi-value">{overview.reservations.filter(r => r.reservation_status === 'pending').length}</p>
                  <p className="kpi-subtext">need confirmation</p>
                </div>
              </div>
            </div>

            {/* Status Summaries */}
            <div className="summary-grid">
              <div className="summary-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <h3 style={{ marginTop: 0 }}>📊 Reservation Status</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {overview.status_summary?.length ? overview.status_summary.map((item) => (
                    <div key={item.reservation_status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                      <span>{item.reservation_status}</span>
                      <strong>{item.total}</strong>
                    </div>
                  )) : <div>No data available.</div>}
                </div>
              </div>

              <div className="summary-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <h3 style={{ marginTop: 0 }}>💳 Payment Status</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {overview.payment_summary?.length ? overview.payment_summary.map((item) => (
                    <div key={item.payment_status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                      <span>{item.payment_status}</span>
                      <strong>{item.total}</strong>
                    </div>
                  )) : <div>No data available.</div>}
                </div>
              </div>

              <div className="summary-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                <h3 style={{ marginTop: 0 }}>📍 Daily Arrivals</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {overview.daily_load?.length ? overview.daily_load.slice(0, 5).map((day) => (
                    <div key={day.check_in_date} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                      <span>{day.check_in_date}</span>
                      <strong>{day.arrivals} arrivals</strong>
                    </div>
                  )) : <div>No arrivals in current window.</div>}
                </div>
              </div>
            </div>

            {/* Reservations List */}
            <div style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋 All Reservations</h2>
              <div className="reservations-table">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Guest</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Dates</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Res. Status</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Payment</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.reservations?.map((reservation, idx) => (
                        <tr key={reservation.id} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#1f2937' }}>{reservation.reservation_code}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '0.9rem' }}>
                              <div style={{ fontWeight: '500' }}>{reservation.guest_name}</div>
                              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{reservation.guest_email}</div>
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.9rem', color: '#4b5563' }}>
                            {String(reservation.check_in_date).slice(0, 10)} → {String(reservation.check_out_date).slice(0, 10)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span className={getStatusBadgeClass(reservation.reservation_status)} style={{ 
                              background: getStatusColor(reservation.reservation_status),
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              display: 'inline-block'
                            }}>
                              {reservation.reservation_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              background: getStatusColor(reservation.payment_status),
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              display: 'inline-block'
                            }}>
                              {reservation.payment_status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                            <div>{formatPeso(reservation.total_amount)}</div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Balance: {formatPeso(reservation.balance_due)}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {reservation.reservation_status === 'pending' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => confirmReservation(reservation.id)}
                                disabled={confirmingId === reservation.id}
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                {confirmingId === reservation.id ? '⏳' : '✓ Confirm'}
                              </button>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div style={{ marginTop: '2rem' }}>
          <ReportGenerator />
        </div>

        <style>{`
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .kpi-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
          }

          .kpi-card:nth-child(2) {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          .kpi-card:nth-child(3) {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          .kpi-card:nth-child(4) {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }

          .kpi-icon {
            font-size: 2.5rem;
            min-width: 60px;
            text-align: center;
          }

          .kpi-content {
            flex: 1;
          }

          .kpi-label {
            margin: 0;
            font-size: 0.85rem;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }

          .kpi-value {
            margin: 0.5rem 0 0.25rem 0;
            font-size: 1.75rem;
            font-weight: 700;
          }

          .kpi-subtext {
            margin: 0;
            font-size: 0.8rem;
            opacity: 0.8;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .summary-card {
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-top: 4px solid #667eea;
          }

          .summary-card h3 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 700;
          }

          .reservations-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border-top: 4px solid #667eea;
          }

          .reservations-table table {
            width: 100%;
          }

          .reservations-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.5px;
          }

          .reservations-table tr:hover {
            background-color: #f9f9f9 !important;
          }

          .badge-inline {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .badge-success { background: #10b981; color: white; }
          .badge-warning { background: #f59e0b; color: white; }
          .badge-danger { background: #ef4444; color: white; }
          .badge-info { background: #3b82f6; color: white; }
          .badge-default { background: #6b7280; color: white; }

          .btn-sm {
            padding: 6px 12px;
            font-size: 0.85rem;
            white-space: nowrap;
          }

          @media (max-width: 768px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }

            .summary-grid {
              grid-template-columns: 1fr;
            }

            .reservations-table {
              font-size: 0.85rem;
            }

            .reservations-table th,
            .reservations-table td {
              padding: 8px !important;
            }

            .kpi-icon {
              font-size: 1.8rem;
              min-width: 50px;
            }

            .kpi-value {
              font-size: 1.3rem;
            }
          }
        `}</style>
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
