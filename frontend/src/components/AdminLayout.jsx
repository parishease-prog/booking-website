import { useNavigate } from 'react-router-dom';
import { clearAdminSession, getStoredAdminUser } from '../utils/adminSession.js';
import { Outlet } from 'react-router-dom';
import CollapsibleNavMenu from './CollapsibleNavMenu';

function AdminLayout() {
  const navigate = useNavigate();
  const adminUser = getStoredAdminUser();

  function handleLogout() {
    clearAdminSession();
    navigate('/admin/login');
  }

  return (
    <div className="page-shell">
      <header className="site-header admin-header">
        <div className="admin-header-brand">
          <div className="brand-mark">Admin Panel</div>
          <div className="admin-subtitle">{adminUser?.full_name || 'Administrator'}</div>
        </div>

        <div className="admin-nav-container">
          <CollapsibleNavMenu />
        </div>

        <button type="button" className="btn btn-secondary admin-logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <Outlet />
    </div>
  );
}

export default AdminLayout;
