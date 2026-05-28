import { useMemo, useState } from 'react';

/**
 * Custom hook for date-based filtering of items
 * @param {Array} allItems - Array of items to filter
 * @param {string} dateField - Name of the date field to filter by (default: 'created_at')
 * @returns {Object} { items: filtered items, dateRange, setDateRange }
 */
function useDateFilter(allItems, dateField = 'created_at') {
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });

  const items = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return allItems;
    }

    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    return allItems.filter((item) => {
      const fieldValue = item[dateField];
      if (!fieldValue) return false;
      const itemDate = new Date(fieldValue);
      return itemDate >= start && itemDate < end;
    });
  }, [allItems, dateRange, dateField]);

  return { items, dateRange, setDateRange };
}

export default useDateFilter;
