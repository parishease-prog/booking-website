import { useState } from 'react';
import { apiGet } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';
import { downloadCSV, downloadJSON, exportReportWithMetadata, downloadPDF } from '../utils/reportExport.js';
import MessageBox from './MessageBox.jsx';

const reportTypes = [
  { value: 'reservations', label: 'Reservations Report', description: 'All reservations with details' },
  { value: 'payments', label: 'Payments Report', description: 'Payment transactions and status' },
  { value: 'revenue', label: 'Revenue Report', description: 'Daily revenue and transaction summary' },
  { value: 'occupancy', label: 'Occupancy Report', description: 'Room occupancy and utilization' },
  { value: 'cancellations', label: 'Cancellations Report', description: 'Cancelled reservations and refunds' },
  { value: 'activity-logs', label: 'Activity Logs Report', description: 'System activity and audit trail' }
];

function ReportGenerator() {
  const token = getAdminToken();
  const [selectedReport, setSelectedReport] = useState('reservations');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);

  async function generateReport() {
    try {
      setLoading(true);
      setMessage(null);
      setGeneratedData(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const queryString = params.toString();
      const url = `/admin/reports/${selectedReport}${queryString ? '?' + queryString : ''}`;
      
      const data = await apiGet(url, { token });
      
      setGeneratedData(data);
      setMessage({ type: 'success', text: `Report generated successfully with ${Array.isArray(data) ? data.length : data?.data?.length || 0} records.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setGeneratedData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!generatedData) {
      setMessage({ type: 'error', text: 'No data to export. Generate a report first.' });
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${selectedReport}-report-${timestamp}`;
    const exportData = Array.isArray(generatedData) ? generatedData : generatedData.data;
    const filters = {
      reportType: selectedReport,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null
    };

    try {
      if (exportFormat === 'csv') {
        downloadCSV(exportData, `${filename}.csv`);
      } else if (exportFormat === 'json') {
        exportReportWithMetadata(exportData, selectedReport, `${filename}.json`, filters);
      } else if (exportFormat === 'pdf') {
        await downloadPDF(exportData, selectedReport, `${filename}.pdf`, filters, generatedData?.summary || null);
      }
      setMessage({ type: 'success', text: `Report exported as ${exportFormat.toUpperCase()}.` });
    } catch (error) {
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    }
  }

  const currentReport = reportTypes.find(r => r.value === selectedReport);
  const recordCount = generatedData ? (Array.isArray(generatedData) ? generatedData.length : generatedData.data?.length || 0) : 0;

  return (
    <section className="report-generator panel">
      <div className="panel-header">
        <p className="eyebrow">Reports</p>
        <h2>Generate and Download Reports</h2>
      </div>

      <MessageBox message={message} />

      <div className="report-filters">
        {/* Report Type Selection */}
        <div className="field-group">
          <label>
            <span>Report Type</span>
            <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} disabled={loading}>
              {reportTypes.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </label>
          {currentReport && <p className="field-help">{currentReport.description}</p>}
        </div>

        {/* Date Range Filters */}
        <div className="filter-section">
          <h3>Date Range</h3>
          <div className="field-grid">
            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </label>
            <label>
              <span>End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {/* Status Filter - show only for specific reports */}
        {['reservations', 'payments', 'activity-logs'].includes(selectedReport) && (
          <div className="filter-section">
            <h3>Additional Filters</h3>
            <label>
              <span>Status (Optional)</span>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Leave empty to include all statuses"
                disabled={loading}
              />
            </label>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Export Section */}
      {generatedData && (
        <div className="report-export-section">
          <div className="report-summary">
            <p><strong>Records:</strong> {recordCount}</p>
            {generatedData.summary && (
              <div className="summary-details">
                {Object.entries(generatedData.summary).map(([key, value]) => {
                  if (typeof value === 'object') return null;
                  return (
                    <p key={key}>
                      <strong>{key.replace(/_/g, ' ')}:</strong> {
                        typeof value === 'number' && key.includes('Amount') || key.includes('Revenue')
                          ? `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : value
                      }
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          <div className="export-controls">
            <label>
              <span>Export Format</span>
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="csv">CSV (Excel compatible)</option>
                <option value="json">JSON (with metadata)</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleExport}
            >
              📥 Download Report as {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReportGenerator;
