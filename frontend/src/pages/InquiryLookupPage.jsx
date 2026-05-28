import { useState } from 'react';
import MessageBox from '../components/MessageBox.jsx';
import { apiGet } from '../services/api.js';

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

function getStatusBadgeClass(status) {
  switch (status) {
    case 'new':
      return 'badge-new';
    case 'read':
      return 'badge-read';
    case 'responded':
      return 'badge-responded';
    case 'archived':
      return 'badge-archived';
    default:
      return '';
  }
}

function getStatusLabel(status) {
  const labels = {
    new: 'New',
    read: 'Read',
    responded: 'Responded',
    archived: 'Archived'
  };
  return labels[status] || status;
}

function InquiryLookupPage() {
  const [email, setEmail] = useState('');
  const [inquiries, setInquiries] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [message, setMessage] = useState(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your email address'
      });
      return;
    }

    try {
      setSearching(true);
      setMessage(null);
      setSelectedInquiry(null);

      const data = await apiGet(`/inquiries/lookup/by-email?email=${encodeURIComponent(email)}`);
      setInquiries(Array.isArray(data) ? data : []);

      if (data.length === 0) {
        setMessage({
          type: 'info',
          text: 'No inquiries found for this email address'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to search inquiries'
      });
      setInquiries(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Contact</p>
          <h1 className="page-title">Check Inquiry Status</h1>
          <p>Enter your email address to view the status of your inquiries and our responses.</p>
        </div>

        <MessageBox message={message} />

        <form className="booking-form" onSubmit={handleSearch}>
          <div className="field-grid">
            <label>
              <span>Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.com"
                disabled={searching}
                required
              />
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {inquiries && inquiries.length > 0 && !selectedInquiry && (
          <div className="inquiries-list">
            <h2>Your Inquiries</h2>
            <div className="list-items">
              {inquiries.map((inquiry) => (
                <div key={inquiry.id} className="list-item">
                  <div className="item-header">
                    <div>
                      <h3>{inquiry.subject}</h3>
                      <p className="item-meta">{formatDateTime(inquiry.created_at)}</p>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(inquiry.status)}`}>
                      {getStatusLabel(inquiry.status)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedInquiry(inquiry)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedInquiry && (
          <div className="inquiry-detail">
            <button
              type="button"
              className="btn-close"
              onClick={() => setSelectedInquiry(null)}
            >
              ← Back to List
            </button>

            <div className="detail-section">
              <h2>{selectedInquiry.subject}</h2>
              <div className="detail-meta">
                <span className={`badge ${getStatusBadgeClass(selectedInquiry.status)}`}>
                  {getStatusLabel(selectedInquiry.status)}
                </span>
                <span className="detail-date">{formatDateTime(selectedInquiry.created_at)}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>Your Inquiry</h3>
              <div className="detail-box">
                <p className="detail-label">Name</p>
                <p>{selectedInquiry.name}</p>
                <p className="detail-label">Email</p>
                <p>{selectedInquiry.email}</p>
                {selectedInquiry.phone && (
                  <>
                    <p className="detail-label">Phone</p>
                    <p>{selectedInquiry.phone}</p>
                  </>
                )}
                <p className="detail-label">Message</p>
                <p className="message-text">{selectedInquiry.message}</p>
              </div>
            </div>

            {selectedInquiry.status === 'responded' && selectedInquiry.response_notes && (
              <div className="detail-section response-section">
                <h3>Our Response</h3>
                <div className="detail-box response-box">
                  <p className="response-date">
                    Responded on {formatDateTime(selectedInquiry.responded_at)}
                  </p>
                  <p className="response-text">{selectedInquiry.response_notes}</p>
                </div>
              </div>
            )}

            {selectedInquiry.status !== 'responded' && (
              <div className="detail-section">
                <div className="info-box">
                  <p>We're working on your inquiry. We'll get back to you as soon as possible!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <style>{`
        .inquiries-list {
          margin-top: 2rem;
        }

        .inquiries-list h2 {
          margin-bottom: 1rem;
          color: #333;
        }

        .list-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .list-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: #f9f9f9;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .item-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .item-meta {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: #666;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge-new {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge-read {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .badge-responded {
          background: #e8f5e9;
          color: #388e3c;
        }

        .badge-archived {
          background: #f5f5f5;
          color: #616161;
        }

        .inquiry-detail {
          margin-top: 2rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 1.5rem;
          background: #fafafa;
        }

        .btn-close {
          background: none;
          border: none;
          color: #1976d2;
          cursor: pointer;
          font-size: 0.95rem;
          padding: 0;
          margin-bottom: 1rem;
          text-decoration: underline;
        }

        .btn-close:hover {
          color: #1565c0;
        }

        .detail-section {
          margin-bottom: 1.5rem;
        }

        .detail-section h3 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .detail-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .detail-date {
          color: #666;
          font-size: 0.9rem;
        }

        .detail-box {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 1rem;
        }

        .detail-label {
          margin: 0.5rem 0 0.25rem 0;
          font-weight: 600;
          color: #555;
          font-size: 0.9rem;
        }

        .detail-box p {
          margin: 0 0 1rem 0;
          line-height: 1.6;
          color: #333;
        }

        .detail-box p:last-child {
          margin-bottom: 0;
        }

        .message-text {
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .response-section {
          background: #f0f8ff;
          border-left: 4px solid #388e3c;
          padding: 1rem;
          border-radius: 4px;
          margin: 0;
        }

        .response-box {
          background: white;
          border-color: #4caf50 !important;
        }

        .response-date {
          color: #388e3c;
          font-weight: 600;
          margin-bottom: 0.5rem !important;
        }

        .response-text {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #333;
        }

        .info-box {
          background: #e3f2fd;
          border-left: 4px solid #1976d2;
          padding: 1rem;
          border-radius: 4px;
          margin: 0;
        }

        .info-box p {
          margin: 0;
          color: #1565c0;
        }
      `}</style>
    </main>
  );
}

export default InquiryLookupPage;
