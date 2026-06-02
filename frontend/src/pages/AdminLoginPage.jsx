import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MessageBox from '../components/MessageBox.jsx';
import { apiPost, apiGet } from '../services/api.js';
import { setAdminSession } from '../utils/adminSession.js';

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch CSRF token on page load
  useEffect(() => {
    (async () => {
      try {
        // Make a GET request to fetch the CSRF token from response headers
        await apiGet('/').catch(() => {
          // Error is expected (auth required), we just need the token from headers
        });
      } catch (err) {
        // Silently ignore errors; we're just fetching the token
      }
    })();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    try {
      setSubmitting(true);
      const data = await apiPost('/admin/auth/login', form);
      setAdminSession(data.token, data.user);
      navigate(location.state?.from || '/admin/slides', { replace: true });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell admin-auth-shell">
      <section className="panel admin-auth-panel">
        <div className="panel-header">
          <p className="eyebrow">Admin Access</p>
          <h1 className="page-title">Administrator Login</h1>
          <p>Use your admin account to manage homepage content and future dashboard tools.</p>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </label>
          <div className="action-row">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <MessageBox message={message} />
      </section>
    </div>
  );
}

export default AdminLoginPage;
