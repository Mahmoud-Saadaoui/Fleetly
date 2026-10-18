import { lazy, Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Loading from "./components/common/Loading";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VehiclesPage = lazy(() => import("./pages/public/VehiclesPage"));
const VehicleDetailPage = lazy(() => import("./pages/public/VehicleDetailPage"));
const BookingsPage = lazy(() => import("./pages/user/BookingsPage"));
const DashboardHome = lazy(() => import("./pages/admin/DashboardHome"));
const VehiclesList = lazy(() => import("./pages/admin/VehiclesList"));
const VehiclesForm = lazy(() => import("./pages/admin/VehiclesForm"));
const BranchesList = lazy(() => import("./pages/admin/BranchesList"));
const BranchesForm = lazy(() => import("./pages/admin/BranchesForm"));
const UsersList = lazy(() => import("./pages/admin/UsersList"));
const BookingsList = lazy(() => import("./pages/admin/BookingsList"));
const CalendarPage = lazy(() => import("./pages/admin/CalendarPage"));
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage"));

const App = () => {
  const { i18n } = useTranslation();

  // Keep document direction/lang in sync for every route (public + dashboard),
  // so the admin dashboard also supports RTL (Arabic).
  useEffect(() => {
    const lang = (i18n.language || "fr").split("-")[0];
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
    <Suspense fallback={<Loading fullScreen />}>
      <Routes>
        {/* Public routes with MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin routes with DashboardLayout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin","agency_manager","user"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="vehicles" element={<VehiclesList />} />
          <Route path="vehicles/new" element={<VehiclesForm />} />
          <Route path="vehicles/:id/edit" element={<VehiclesForm />} />
          <Route path="branches" element={<BranchesList />} />
          <Route path="branches/new" element={<BranchesForm />} />
          <Route path="branches/:id/edit" element={<BranchesForm />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;