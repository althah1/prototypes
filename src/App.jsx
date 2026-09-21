import { Routes, Route, Navigate } from 'react-router-dom';

import { DataProvider } from './store/DbContext';
import { AuthProvider } from './store/AuthContext';
import { ToastProvider } from './components/ui/ToastProvider';
import { SyncProvider } from './store/SyncContext';
import { GuestOnly, RequireRole } from './components/routes/Guards';

import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerification from './pages/auth/OtpVerification';
import ResetPassword from './pages/auth/ResetPassword';

import DashboardLayout from './components/layout/DashboardLayout';
import MobileLayout from './components/layout/MobileLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Home from './pages/mobile/Home';
import Notifications from './pages/mobile/Notifications';
import Profile from './pages/profile/Profile';
import EntityPage from './pages/master/EntityPage';
import GudangDetail from './pages/master/GudangDetail';

import TaskDesktop from './pages/tasks/TaskDesktop';
import TaskMobile from './pages/tasks/TaskMobile';
import TaskDetail from './pages/tasks/TaskDetail';

import OrderMobile from './pages/orders/OrderMobile';
import OrderDesktop from './pages/orders/OrderDesktop';
import Billing from './pages/orders/Billing';

import QuoteMobile from './pages/quotes/QuoteMobile';
import QuoteDesktop from './pages/quotes/QuoteDesktop';

import AuditMobile from './pages/audit/AuditMobile';
import AuditDesktop from './pages/audit/AuditDesktop';
import Prospek from './pages/audit/Prospek';

import GpsMobile from './pages/gps/GpsMobile';
import GpsDesktop from './pages/gps/GpsDesktop';

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <ToastProvider>
          <SyncProvider>
            <Routes>
              {/* ===== Publik (belum login) ===== */}
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<OtpVerification />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              {/* ===== Web Dashboard — Admin / Supervisor / Finance ===== */}
              <Route element={<RequireRole roles={['admin', 'supervisor', 'finance']} />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="profile" element={<Profile />} />

                  {/* Master Data — CRUD generik, URUTAN BARU */}
                  <Route path="master/perusahaan"       element={<EntityPage key="perusahaan"       slug="perusahaan" />} />
                  <Route path="master/gudang"           element={<EntityPage key="gudang"           slug="gudang" />} />
                  <Route path="master/gudang/:id"       element={<GudangDetail />} />
                  <Route path="master/supplier"         element={<EntityPage key="supplier"         slug="supplier" />} />
                  <Route path="master/area-kerja"       element={<EntityPage key="area-kerja"       slug="area-kerja" />} />
                  <Route path="master/sales"            element={<EntityPage key="sales"            slug="sales" />} />
                  <Route path="master/supervisor"       element={<EntityPage key="supervisor"       slug="supervisor" />} />
                  <Route path="master/outlet"           element={<EntityPage key="outlet"           slug="outlet" />} />
                  <Route path="master/kategori-prospek" element={<EntityPage key="kategori-prospek" slug="kategori-prospek" />} />
                  <Route path="master/tugas"            element={<EntityPage key="tugas"            slug="tugas" />} />
                  <Route path="master/produk"           element={<EntityPage key="produk"           slug="produk" />} />

                  {/* Modul operasional */}
                  <Route path="tasks"      element={<TaskDesktop />} />
                  <Route path="orders"     element={<OrderDesktop />} />
                  <Route path="billing"    element={<Billing />} />
                  <Route path="quotations" element={<QuoteDesktop />} />
                  <Route path="audit"      element={<AuditDesktop />} />
                  <Route path="prospek"    element={<Prospek />} />
                  <Route path="gps"        element={<GpsDesktop />} />
                </Route>
              </Route>

              {/* ===== Web Mobile — Sales ===== */}
              <Route element={<RequireRole roles={['sales']} />}>
                <Route path="/app" element={<MobileLayout />}>
                  <Route index element={<Home />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="profile"   element={<Profile />} />
                  <Route path="tasks"     element={<TaskMobile />} />
                  <Route path="tasks/:id" element={<TaskDetail />} />
                  <Route path="order"     element={<OrderMobile />} />
                  <Route path="quotes"    element={<QuoteMobile />} />
                  <Route path="audit"     element={<AuditMobile />} />
                  <Route path="gps"       element={<GpsMobile />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </SyncProvider>
        </ToastProvider>
      </AuthProvider>
    </DataProvider>
  );
}