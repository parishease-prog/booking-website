import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout.jsx';
import AdminProtectedRoute from './components/AdminProtectedRoute.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import AdminAmenitiesPage from './pages/AdminAmenitiesPage.jsx';
import AdminCancellationRequestsPage from './pages/AdminCancellationRequestsPage.jsx';
import AdminInquiriesPage from './pages/AdminInquiriesPage.jsx';
import AdminLandingContentPage from './pages/AdminLandingContentPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPaymentsPage from './pages/AdminPaymentsPage.jsx';
import AdminOperationsPage from './pages/AdminOperationsPage.jsx';
import AdminRefundRequestsPage from './pages/AdminRefundRequestsPage.jsx';
import AdminReservationsPage from './pages/AdminReservationsPage.jsx';
import AdminRoomsPage from './pages/AdminRoomsPage.jsx';
import AdminSlidesPage from './pages/AdminSlidesPage.jsx';
import AdminStayExtensionsPage from './pages/AdminStayExtensionsPage.jsx';
import BookingReceiptPage from './pages/BookingReceiptPage.jsx';
import BookingSuccessPage from './pages/BookingSuccessPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import HomePage from './pages/HomePage.jsx';
import InquiryLookupPage from './pages/InquiryLookupPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import ReservePage from './pages/ReservePage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import TrackBookingPage from './pages/TrackBookingPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/reservations" element={<AdminReservationsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/inquiries" element={<AdminInquiriesPage />} />
          <Route path="/admin/cancellation-requests" element={<AdminCancellationRequestsPage />} />
          <Route path="/admin/refund-requests" element={<AdminRefundRequestsPage />} />
          <Route path="/admin/stay-extensions" element={<AdminStayExtensionsPage />} />
          <Route path="/admin/operations" element={<AdminOperationsPage />} />
          <Route path="/admin/rooms" element={<AdminRoomsPage />} />
          <Route path="/admin/amenities" element={<AdminAmenitiesPage />} />
          <Route path="/admin/amenities-content" element={<Navigate to="/admin/amenities" replace />} />
          <Route path="/admin/amenities-cards" element={<Navigate to="/admin/amenities" replace />} />
          <Route path="/admin/landing-content" element={<AdminLandingContentPage />} />
          <Route path="/admin/slides" element={<AdminSlidesPage />} />
        </Route>
      </Route>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/reserve" element={<ReservePage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking-success/:code" element={<BookingSuccessPage />} />
        <Route path="/track" element={<TrackBookingPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/my-bookings/:code/receipt" element={<BookingReceiptPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/inquiry-lookup" element={<InquiryLookupPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
