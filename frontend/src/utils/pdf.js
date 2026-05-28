import html2pdf from 'html2pdf.js';

/**
 * Generate and download a booking confirmation PDF
 * @param {Object} reservation - Reservation data
 * @param {string} filename - PDF filename (default: reservation code)
 */
export function downloadBookingConfirmationPDF(reservation, filename = null) {
  if (!reservation) {
    throw new Error('Reservation data is required');
  }

  const code = reservation.reservation_code || 'booking';
  const pdfFilename = filename || `${code}-confirmation.pdf`;

  // Create HTML content for PDF
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 3px solid #2d5f4f; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; color: #2d5f4f;">RESERVATION SUMMARY</h1>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #2d5f4f; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 15px;">RESERVATION DETAILS</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 40%;">Reservation Code:</td>
            <td style="padding: 8px 0; color: #2d5f4f; font-weight: bold; font-size: 18px;">${reservation.reservation_code}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Guest Name:</td>
            <td style="padding: 8px 0; color: #555;">${reservation.guest_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td>
            <td style="padding: 8px 0; color: #555;">${reservation.guest_email || 'N/A'}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Status:</td>
            <td style="padding: 8px 0; color: #555;">${formatStatus(reservation.reservation_status)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #2d5f4f; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 15px;">STAY INFORMATION</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 40%;">Check-in Date:</td>
            <td style="padding: 8px 0; color: #555;">${formatDate(reservation.check_in_date)}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Check-out Date:</td>
            <td style="padding: 8px 0; color: #555;">${formatDate(reservation.check_out_date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Guests:</td>
            <td style="padding: 8px 0; color: #555;">${reservation.adult_count || 0} adult(s), ${reservation.child_count || 0} child(ren)</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #2d5f4f; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 15px;">PAYMENT SUMMARY</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 60%;">Subtotal:</td>
            <td style="padding: 8px 0; text-align: right; color: #555;">${formatPeso(reservation.subtotal_amount)}</td>
          </tr>
          ${reservation.discount_amount > 0 ? `
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Discount:</td>
            <td style="padding: 8px 0; text-align: right; color: #555;">-${formatPeso(reservation.discount_amount)}</td>
          </tr>
          ` : ''}
          ${reservation.extra_charges_amount > 0 ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Additional Charges:</td>
            <td style="padding: 8px 0; text-align: right; color: #555;">+${formatPeso(reservation.extra_charges_amount)}</td>
          </tr>
          ` : ''}
          <tr style="background: #f0f0f0; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd;">
            <td style="padding: 12px 0; font-weight: bold; color: #2d5f4f; font-size: 16px;">Total Amount:</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #2d5f4f; font-size: 16px;">${formatPeso(reservation.total_amount)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Amount Paid:</td>
            <td style="padding: 8px 0; text-align: right; color: #555;">${formatPeso(reservation.amount_paid)}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Payment Status:</td>
            <td style="padding: 8px 0; text-align: right; color: #555;">${formatStatus(reservation.payment_status)}</td>
          </tr>
          ${reservation.balance_due > 0 ? `
          <tr style="background: #fff3cd;">
            <td style="padding: 8px 0; font-weight: bold; color: #856404;">Balance Due:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #856404;">${formatPeso(reservation.balance_due)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${reservation.special_requests ? `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #2d5f4f; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 15px;">SPECIAL REQUESTS</h2>
        <p style="margin: 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2d5f4f; color: #555;">${reservation.special_requests}</p>
      </div>
      ` : ''}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p style="margin: 0 0 10px 0;">Thank you for your reservation!</p>
        <p style="margin: 0;">This is an automated confirmation. Please save this document for your records.</p>
        <p style="margin: 10px 0 0 0; color: #999;">Generated: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;

  // PDF options
  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: [10, 10, 10, 10],
    filename: pdfFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  // Generate and download PDF
  html2pdf().set(options).from(element).save();
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (error) {
    return String(dateString).slice(0, 10);
  }
}

/**
 * Format peso amount
 */
function formatPeso(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
}

/**
 * Format status to title case
 */
function formatStatus(status) {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
