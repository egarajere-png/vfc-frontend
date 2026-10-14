import { Route, Routes } from 'react-router-dom';
import { AdminLayout, PublicLayout, RequireAuth } from './components/Layouts';
import Home from './pages/Home';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import { Login, Signup } from './pages/Auth';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import TicketPage from './pages/TicketPage';
import Outbox from './pages/Outbox';
import NotFound from './pages/NotFound';
import Dashboard from './pages/admin/Dashboard';
import AdminMeetings from './pages/admin/AdminMeetings';
import MeetingForm from './pages/admin/MeetingForm';
import Attendees from './pages/admin/Attendees';
import Payments from './pages/admin/Payments';
import Scanner from './pages/admin/Scanner';
import Reports from './pages/admin/Reports';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="meetings/:slug" element={<MeetingDetail />} />
        <Route path="meetings/:slug/register" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="account/:tab?" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="tickets/:ref" element={<RequireAuth><TicketPage /></RequireAuth>} />
        <Route path="demo/outbox" element={<Outbox />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="meetings" element={<AdminMeetings />} />
          <Route path="meetings/new" element={<MeetingForm />} />
          <Route path="meetings/:id/edit" element={<MeetingForm />} />
          <Route path="attendees" element={<Attendees />} />
          <Route path="payments" element={<Payments />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
