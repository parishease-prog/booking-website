import html2pdf from 'html2pdf.js';

/**
 * Export data to CSV format and download
 */
export function downloadCSV(data, filename = 'report.csv') {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csv = headers.map(h => `"${h}"`).join(',') + '\n';
  
  csv += data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Handle dates
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  }).join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format and download
 */
export function downloadJSON(data, filename = 'report.json') {
  if (!data) {
    alert('No data to export');
    return;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for display
 */
export function formatReportDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

/**
 * Format currency for reports
 */
export function formatReportCurrency(value) {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP'
  }).format(value);
}

/**
 * Create report metadata
 */
export function createReportMetadata(reportType, filters = {}) {
  return {
    reportType,
    generatedAt: new Date().toISOString(),
    filters,
    version: '1.0'
  };
}

/**
 * Export report with metadata
 */
export function exportReportWithMetadata(data, reportType, filename = 'report.json', filters = {}) {
  const report = {
    metadata: createReportMetadata(reportType, filters),
    data: data
  };
  
  downloadJSON(report, filename);
}

function toTitleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function appendKeyValueRow(table, label, value) {
  const tr = document.createElement('tr');

  const tdLabel = document.createElement('td');
  tdLabel.textContent = label;
  tdLabel.style.fontWeight = 'bold';
  tdLabel.style.padding = '4px 8px';
  tdLabel.style.verticalAlign = 'top';
  tdLabel.style.width = '35%';

  const tdValue = document.createElement('td');
  tdValue.textContent = value;
  tdValue.style.padding = '4px 8px';
  tdValue.style.verticalAlign = 'top';

  tr.appendChild(tdLabel);
  tr.appendChild(tdValue);
  table.appendChild(tr);
}

/**
 * Export data to PDF format and download
 */
export async function downloadPDF(data, reportType, filename = 'report.pdf', filters = {}, summary = null) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Large reports can produce very big PDFs and/or browser freezes
  if (data.length > 1500) {
    const proceed = window.confirm(
      `This report has ${data.length} rows and may take a long time to export as PDF. Continue?`
    );
    if (!proceed) return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.fontFamily = 'Arial, sans-serif';
  wrapper.style.fontSize = '11px';
  wrapper.style.color = '#111';
  wrapper.style.padding = '16px';
  wrapper.style.maxWidth = '1100px';

  const header = document.createElement('div');
  header.style.borderBottom = '2px solid #2d5f4f';
  header.style.paddingBottom = '10px';
  header.style.marginBottom = '14px';

  const title = document.createElement('h1');
  title.textContent = `${toTitleCase(reportType)} Report`;
  title.style.margin = '0 0 6px 0';
  title.style.fontSize = '18px';
  title.style.color = '#2d5f4f';
  header.appendChild(title);

  const sub = document.createElement('div');
  sub.textContent = `Generated: ${new Date().toLocaleString()}`;
  sub.style.color = '#444';
  header.appendChild(sub);

  wrapper.appendChild(header);

  const metaSection = document.createElement('div');
  metaSection.style.marginBottom = '12px';

  const metaTitle = document.createElement('h2');
  metaTitle.textContent = 'Filters';
  metaTitle.style.margin = '0 0 6px 0';
  metaTitle.style.fontSize = '13px';
  metaTitle.style.color = '#2d5f4f';
  metaSection.appendChild(metaTitle);

  const metaTable = document.createElement('table');
  metaTable.style.width = '100%';
  metaTable.style.borderCollapse = 'collapse';
  metaTable.style.border = '1px solid #ddd';
  metaTable.style.marginBottom = '10px';

  const filterEntries = Object.entries(filters || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (filterEntries.length === 0) {
    appendKeyValueRow(metaTable, 'Filters', 'None');
  } else {
    filterEntries.forEach(([k, v]) => appendKeyValueRow(metaTable, toTitleCase(k), formatValue(v)));
  }
  appendKeyValueRow(metaTable, 'Records', String(data.length));

  metaSection.appendChild(metaTable);

  if (summary && typeof summary === 'object') {
    const summaryTitle = document.createElement('h2');
    summaryTitle.textContent = 'Summary';
    summaryTitle.style.margin = '0 0 6px 0';
    summaryTitle.style.fontSize = '13px';
    summaryTitle.style.color = '#2d5f4f';
    metaSection.appendChild(summaryTitle);

    const summaryTable = document.createElement('table');
    summaryTable.style.width = '100%';
    summaryTable.style.borderCollapse = 'collapse';
    summaryTable.style.border = '1px solid #ddd';

    Object.entries(summary).forEach(([k, v]) => {
      if (v && typeof v === 'object') return;
      appendKeyValueRow(summaryTable, toTitleCase(k), formatValue(v));
    });

    metaSection.appendChild(summaryTable);
  }

  wrapper.appendChild(metaSection);

  const dataTitle = document.createElement('h2');
  dataTitle.textContent = 'Data';
  dataTitle.style.margin = '0 0 8px 0';
  dataTitle.style.fontSize = '13px';
  dataTitle.style.color = '#2d5f4f';
  wrapper.appendChild(dataTitle);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.border = '1px solid #ddd';

  const columns = Object.keys(data[0] || {});

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = toTitleCase(col);
    th.style.textAlign = 'left';
    th.style.padding = '6px 8px';
    th.style.borderBottom = '1px solid #ddd';
    th.style.background = '#f6f6f6';
    th.style.fontWeight = 'bold';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    if (rowIndex % 2 === 1) tr.style.background = '#fbfbfb';
    columns.forEach(col => {
      const td = document.createElement('td');
      td.textContent = formatValue(row?.[col]);
      td.style.padding = '6px 8px';
      td.style.borderBottom = '1px solid #eee';
      td.style.verticalAlign = 'top';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  // Keep it offscreen but in DOM for rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#fff';
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const options = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
  };

  try {
    await html2pdf().set(options).from(wrapper).save();
  } finally {
    document.body.removeChild(container);
  }
}
