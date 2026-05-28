import { useState } from 'react';

function DateFilter({ onDateRangeChange }) {
  const [filterType, setFilterType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  function getDateRange(type) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (type) {
      case 'today': {
        const tomorrow = new Date(startOfToday);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return {
          startDate: startOfToday.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0]
        };
      }

      case 'week': {
        const firstDay = new Date(startOfToday);
        firstDay.setDate(startOfToday.getDate() - startOfToday.getDay());
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 7);
        return {
          startDate: firstDay.toISOString().split('T')[0],
          endDate: lastDay.toISOString().split('T')[0]
        };
      }

      case 'month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return {
          startDate: firstDay.toISOString().split('T')[0],
          endDate: lastDay.toISOString().split('T')[0]
        };
      }

      case 'last7': {
        const startDate = new Date(startOfToday);
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date(startOfToday);
        endDate.setDate(endDate.getDate() + 1);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }

      case 'last30': {
        const startDate = new Date(startOfToday);
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date(startOfToday);
        endDate.setDate(endDate.getDate() + 1);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }

      case 'last90': {
        const startDate = new Date(startOfToday);
        startDate.setDate(startDate.getDate() - 90);
        const endDate = new Date(startOfToday);
        endDate.setDate(endDate.getDate() + 1);
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }

      case 'custom': {
        if (!customStartDate || !customEndDate) {
          return null;
        }
        const endDate = new Date(customEndDate);
        endDate.setDate(endDate.getDate() + 1);
        return {
          startDate: customStartDate,
          endDate: endDate.toISOString().split('T')[0]
        };
      }

      case 'all':
      default:
        return { startDate: null, endDate: null };
    }
  }

  function handleFilterChange(newFilterType) {
    setFilterType(newFilterType);
    const range = getDateRange(newFilterType);
    onDateRangeChange(range);
  }

  function handleCustomDateChange() {
    if (filterType === 'custom') {
      const range = getDateRange('custom');
      if (range) {
        onDateRangeChange(range);
      }
    }
  }

  return (
    <div className="date-filter">
      <div className="filter-buttons">
        <button
          type="button"
          className={`filter-btn ${filterType === 'today' ? 'active' : ''}`}
          onClick={() => handleFilterChange('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'week' ? 'active' : ''}`}
          onClick={() => handleFilterChange('week')}
        >
          This Week
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'month' ? 'active' : ''}`}
          onClick={() => handleFilterChange('month')}
        >
          This Month
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'last7' ? 'active' : ''}`}
          onClick={() => handleFilterChange('last7')}
        >
          Last 7 Days
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'last30' ? 'active' : ''}`}
          onClick={() => handleFilterChange('last30')}
        >
          Last 30 Days
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'last90' ? 'active' : ''}`}
          onClick={() => handleFilterChange('last90')}
        >
          Last 90 Days
        </button>
        <button
          type="button"
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All Time
        </button>
      </div>

      {filterType === 'custom' && (
        <div className="custom-date-range">
          <label>
            <span>Start Date</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
          </label>
          <label>
            <span>End Date</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCustomDateChange}
            disabled={!customStartDate || !customEndDate}
          >
            Apply
          </button>
        </div>
      )}

      {filterType !== 'custom' && (
        <button
          type="button"
          className={`filter-btn ${filterType === 'custom' ? 'active' : ''}`}
          onClick={() => handleFilterChange('custom')}
        >
          Custom Range
        </button>
      )}
    </div>
  );
}

export default DateFilter;
