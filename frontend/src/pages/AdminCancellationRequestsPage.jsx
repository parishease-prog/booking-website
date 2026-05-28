import { useEffect, useMemo, useState } from 'react';
import MessageBox from '../components/MessageBox.jsx'
import DateFilter from '../components/DateFilter.jsx';
import { apiDelete, apiGet, apiPatch } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'completed', label: 'Completed' }
];

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
}

function AdminCancellationRequestsPage() {
  const token = getAdminToken();
  const [requests, setRequests] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const query = statusFilter ? `?request_status=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiGet(`/requests/cancellation-requests${query}`, { token });
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, [statusFilter, token]);

  const filteredRequests = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return requests;
    }
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return requests.filter((request) => {
      const requestDate = new Date(request.requested_at);
      return requestDate >= start && requestDate < end;
    });
  }, [requests, dateRange]);

  async function handleSelectRequest(request) {
    setSelectedRequest(request);
    setResponseNotes(request.review_notes || '');
  }

  async function handleUpdateStatus(newStatus) {
    if (!selectedRequest) return;

    try {
      setUpdatingId(selectedRequest.id);
      await apiPatch(
        `/requests/cancellation-requests/${selectedRequest.id}`,
        {
          request_status: newStatus,
          review_notes: responseNotes || null
        },
        { token }
      );

      setMessage({ type: 'success', text: 'Request updated successfully' });
      await loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      setDeletingId(id);
      await apiDelete(`/requests/cancellation-requests/${id}`, { token });
      setMessage({ type: 'success', text: 'Request deleted successfully' });
      setSelectedRequest(null);
      await loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Guest Requests</p>
          <h1 className="page-title">Cancellation Requests</h1>
          <p>Review and process guest cancellation requests.</p>
        </div>

        <MessageBox message={message} />

        <div className="panel-header">
          <h2>Filter by status</h2>
        </div>

        <div className="field-grid">
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DateFilter onDateRangeChange={setDateRange} />

        <div className={filteredRequests.length ? 'room-list' : 'room-list empty-state'}>
          {loading ? 'Loading requests...' : filteredRequests.length ? filteredRequests.map((request) => (
            <article
              className={`room-card${selectedRequest?.id === request.id ? ' selected' : ''}`}
              key={request.id}
              onClick={() => handleSelectRequest(request)}
              style={{ cursor: 'pointer' }}
            >
              <header>
                <div>
                  <h3>{request.reservation_code}</h3>
                  <p className="room-meta">From {request.requested_by}</p>
                </div>
                <span className="tag">{
                  statusOptions.find(o => o.value === request.request_status)?.label || request.request_status
                }</span>
              </header>
              <p className="room-meta">{request.reason?.substring(0, 100)}...</p>
              <p className="room-meta">{formatDateTime(request.requested_at)}</p>
            </article>
          )) : 'No requests found.'}
        </div>
      </section>

      <aside className="sidebar">
        {selectedRequest ? (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Request Details</h2>
            </div>

            <div className="summary-card">
              <div><strong>Reservation:</strong> {selectedRequest.reservation_code}</div>
              <div><strong>Requested by:</strong> {selectedRequest.requested_by}</div>
              <div><strong>Status:</strong> {
                statusOptions.find(o => o.value === selectedRequest.request_status)?.label || selectedRequest.request_status
              }</div>
              <div><strong>Submitted:</strong> {formatDateTime(selectedRequest.requested_at)}</div>
            </div>

            <div className="panel-header">
              <h3>Reason</h3>
            </div>
            <p className="room-meta" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {selectedRequest.reason}
            </p>

            {selectedRequest.review_notes && (
              <>
                <div className="panel-header">
                  <h3>Response Notes</h3>
                </div>
                <p className="room-meta" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedRequest.review_notes}
                </p>
              </>
            )}

            <div className="panel-header">
              <h3>Process Request</h3>
            </div>

            <form className="booking-form" onSubmit={(e) => { e.preventDefault(); }}>
              <label className="full-width">
                <span>Response Notes</span>
                <textarea
                  rows="4"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                />
              </label>

              <div className="field-grid">
                <label>
                  <span>Status</span>
                  <select
                    value={selectedRequest.request_status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    disabled={updatingId === selectedRequest.id}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDelete(selectedRequest.id)}
                  disabled={deletingId === selectedRequest.id}
                >
                  {deletingId === selectedRequest.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Select a request</h2>
            </div>
            <p className="room-meta">Click on a request from the list to view details and respond.</p>
          </section>
        )}
      </aside>
    </main>
  );
}

export default AdminCancellationRequestsPage;
