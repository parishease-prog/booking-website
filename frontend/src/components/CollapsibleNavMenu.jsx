import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';

function CollapsibleNavMenu() {
  const [expandedGroups, setExpandedGroups] = useState({
    bookingOps: true,
    contentMgmt: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  function toggleGroup(groupKey) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  const menuGroups = [
    {
      key: 'bookingOps',
      label: 'Booking Operations',
      items: [
        { label: 'Reservations', path: '/admin/reservations' },
        { label: 'Payments', path: '/admin/payments' },
        { label: 'Inquiries', path: '/admin/inquiries' },
        { label: 'Cancellations', path: '/admin/cancellation-requests' },
        { label: 'Refunds', path: '/admin/refund-requests' },
        { label: 'Extensions', path: '/admin/stay-extensions' },
        { label: 'Operations', path: '/admin/operations' },
      ],
    },
    {
      key: 'contentMgmt',
      label: 'Content Management',
      items: [
        { label: 'Rooms', path: '/admin/rooms' },
        { label: 'Landing Section', path: '/admin/landing-content' },
        { label: 'Amenities', path: '/admin/amenities' },
        { label: 'Homepage Slides', path: '/admin/slides' },
      ],
    },
  ];

  // Filter groups and items based on search query
  const filteredMenuGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return menuGroups;
    }

    const query = searchQuery.toLowerCase();
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  // Auto-expand groups when searching
  const displayedGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredMenuGroups.map((group) => group.key);
    }
    return Object.keys(expandedGroups).filter((key) => expandedGroups[key]);
  }, [searchQuery, expandedGroups, filteredMenuGroups]);

  return (
    <nav className="collapsible-nav" aria-label="Admin">
      <div className="nav-search">
        <input
          type="text"
          placeholder="Search menu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="nav-search-input"
        />
      </div>

      {filteredMenuGroups.length > 0 ? (
        filteredMenuGroups.map((group) => (
          <div key={group.key} className="nav-group">
            <button
              type="button"
              className={`nav-group-header ${displayedGroups.includes(group.key) ? 'expanded' : ''}`}
              onClick={() => toggleGroup(group.key)}
              aria-expanded={displayedGroups.includes(group.key)}
              aria-controls={`group-${group.key}`}
            >
              <span className="group-label">{group.label}</span>
              <span className="group-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 6L10 10L6 10Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </button>

            {displayedGroups.includes(group.key) && (
              <div className="nav-group-items" id={`group-${group.key}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-link nav-sublink${isActive ? ' active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="nav-no-results">No menu items found</div>
      )}
    </nav>
  );
}

export default CollapsibleNavMenu;
