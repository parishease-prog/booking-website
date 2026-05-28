import { useEffect, useMemo, useState } from 'react';
import MessageBox from '../components/MessageBox.jsx';
import DateFilter from '../components/DateFilter.jsx';
import { apiDelete, apiGet, apiPatch } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';
import { maskEmail } from '../utils/validation.js';

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'responded', label: 'Responded' },
  { value: 'archived', label: 'Archived' }
];

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
}

function AdminInquiriesPage() {
  const token = getAdminToken();
  const [inquiries, setInquiries] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadInquiries() {
    try {
      setLoading(true);
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiGet(`/inquiries${query}`, { token });
      setInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries();
  }, [statusFilter, token]);

  const filteredInquiries = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return inquiries;
    }
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return inquiries.filter((inq) => {
      const inqDate = new Date(inq.created_at);
      return inqDate >= start && inqDate < end;
    });
  }, [inquiries, dateRange]);

  async function handleSelectInquiry(inquiry) {
    try {
      setSelectedInquiry(null);
      const detail = await apiGet(`/inquiries/${inquiry.id}`, { token });
      setSelectedInquiry(detail);
      setResponseNotes(detail.response_notes || '');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  async function handleUpdateStatus(newStatus) {
    if (!selectedInquiry) return;

    try {
      setUpdatingId(selectedInquiry.id);
      await apiPatch(`/inquiries/${selectedInquiry.id}`, {
        status: newStatus,
        response_notes: responseNotes || null
      }, { token });

      setMessage({ type: 'success', text: 'Inquiry updated successfully' });
      await loadInquiries();
      
      if (newStatus === 'responded') {
        const detail = await apiGet(`/inquiries/${selectedInquiry.id}`, { token });
        setSelectedInquiry(detail);
        setResponseNotes(detail.response_notes || '');
      } else {
        setSelectedInquiry(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveResponse() {
    if (!selectedInquiry) return;

    try {
      setUpdatingId(selectedInquiry.id);
      await apiPatch(`/inquiries/${selectedInquiry.id}`, {
        status: 'responded',
        response_notes: responseNotes
      }, { token });

      setMessage({ type: 'success', text: 'Response saved successfully' });
      await loadInquiries();
      const detail = await apiGet(`/inquiries/${selectedInquiry.id}`, { token });
      setSelectedInquiry(detail);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;

    try {
      setDeletingId(id);
      await apiDelete(`/inquiries/${id}`, { token });
      setMessage({ type: 'success', text: 'Inquiry deleted successfully' });
      setSelectedInquiry(null);
      await loadInquiries();
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
          <p className="eyebrow">Communication</p>
          <h1 className="page-title">Inquiries</h1>
          <p>Manage guest inquiries and respond to their questions.</p>
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

        <div className={filteredInquiries.length ? 'room-list' : 'room-list empty-state'}>
          {loading ? 'Loading inquiries...' : filteredInquiries.length ? filteredInquiries.map((inquiry) => (
            <article
              className={`room-card${selectedInquiry?.id === inquiry.id ? ' selected' : ''}`}
              key={inquiry.id}
              onClick={() => handleSelectInquiry(inquiry)}
              style={{ cursor: 'pointer' }}
            >
              <header>
                <div>
                  <h3>{inquiry.subject}</h3>
                  <p className="room-meta">From {inquiry.name} ({maskEmail(inquiry.email)})</p>
                </div>
                <span className="tag">{
                  statusOptions.find(o => o.value === inquiry.status)?.label || inquiry.status
                }</span>
              </header>
              <p className="room-meta">{inquiry.message.substring(0, 100)}...</p>
              <p className="room-meta">{formatDateTime(inquiry.created_at)}</p>
            </article>
          )) : 'No inquiries found.'}
        </div>
      </section>

      <aside className="sidebar">
        {selectedInquiry ? (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Inquiry Details</h2>
            </div>

            <div className="summary-card">
              <div><strong>From:</strong> {selectedInquiry.name}</div>
              <div><strong>Email:</strong> {maskEmail(selectedInquiry.email)}</div>
              {selectedInquiry.phone && <div><strong>Phone:</strong> {selectedInquiry.phone}</div>}
              <div><strong>Subject:</strong> {selectedInquiry.subject}</div>
              <div><strong>Status:</strong> {
                statusOptions.find(o => o.value === selectedInquiry.status)?.label || selectedInquiry.status
              }</div>
              <div><strong>Submitted:</strong> {formatDateTime(selectedInquiry.created_at)}</div>
              {selectedInquiry.responded_at && <div><strong>Responded:</strong> {formatDateTime(selectedInquiry.responded_at)}</div>}
            </div>

            <div className="panel-header">
              <h3>Message</h3>
            </div>
            <p className="room-meta" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {selectedInquiry.message}
            </p>

            {selectedInquiry.response_notes && (
              <>
                <div className="panel-header">
                  <h3>Response Notes</h3>
                </div>
                <p className="room-meta" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedInquiry.response_notes}
                </p>
              </>
            )}

            <div className="panel-header">
              <h3>Respond</h3>
            </div>

            <form className="booking-form" onSubmit={(e) => { e.preventDefault(); handleSaveResponse(); }}>
              <label className="full-width">
                <span>Response Notes</span>
                <textarea
                  rows="4"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Type your response here..."
                />
              </label>

              <div className="field-grid">
                <label>
                  <span>Status</span>
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    disabled={updatingId === selectedInquiry.id}
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
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingId === selectedInquiry.id}
                >
                  {updatingId === selectedInquiry.id ? 'Saving...' : 'Save Response'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDelete(selectedInquiry.id)}
                  disabled={deletingId === selectedInquiry.id}
                >
                  {deletingId === selectedInquiry.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <p className="eyebrow">Details</p>
              <h2>Select an inquiry</h2>
            </div>
            <p className="room-meta">Click on an inquiry from the list to view details and respond.</p>
          </section>
        )}
      </aside>
    </main>
  );
}

export default AdminInquiriesPage;
