import { useState } from 'react';
import { Link } from 'react-router-dom';
import MessageBox from '../components/MessageBox.jsx';
import { apiPost } from '../services/api.js';

function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name || !form.email || !form.subject || !form.message) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields'
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      await apiPost('/inquiries', form);

      setMessage({
        type: 'success',
        text: 'Your inquiry has been submitted successfully. We will respond to you soon!'
      });

      setForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to submit inquiry'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main-grid">
      <section className="panel">
        <div className="panel-header">
          <p className="eyebrow">Contact</p>
          <h1 className="page-title">Inquiry Form</h1>
          <p>Curious about us? Hit us up with your inquiries. We're friendly enough to answer them :)</p>
        </div>

        <MessageBox message={message} />

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Juan Dela Cruz" required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="juan@example.com" required />
            </label>
            <label>
              <span>Phone</span>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="09123456789" />
            </label>
            <label>
              <span>Subject</span>
              <input name="subject" value={form.subject} onChange={handleChange} placeholder="Booking inquiry" required />
            </label>
          </div>
          <label className="full-width">
            <span>Message</span>
            <textarea name="message" rows="5" value={form.message} onChange={handleChange} placeholder="How can we help you?" required />
          </label>
          <div className="action-row">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </div>
        </form>
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Support</p>
            <h2>Quick help</h2>
          </div>
          <div className="summary-card">
            <div>Use the reservation page to create a booking.</div>
            <div>Use track booking to check reservation status.</div>
            <div>Keep the reservation code after submitting a booking.</div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Check Inquiry Status</h2>
          </div>
          <p style={{ marginBottom: '1rem' }}>Want to check the status of your inquiry and see our response?</p>
          <Link to="/inquiry-lookup" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
            Check Inquiry Status
          </Link>
        </section>
      </aside>
    </main>
  );
}

export default ContactPage;
