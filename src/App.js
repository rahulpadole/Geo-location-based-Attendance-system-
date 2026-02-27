import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { FullPageLoader } from "./components/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";
import FirebaseTest from "./pages/FirebaseTest";

// Layout components
import Navbar from "./components/ResponsiveNavbar";
import Footer from "./components/Footer";

// Lazy load components
const Login = lazy(() => import("./auth/Login"));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword"));

// Teacher pages
const TeacherDashboard = lazy(() => import("./teacher/Dashboard"));
const MarkAttendance = lazy(() => import("./teacher/Attendance"));
const MarkLeave = lazy(() => import("./teacher/Leave"));
const History = lazy(() => import("./teacher/History"));
const TeacherProfile = lazy(() => import("./teacher/Profile"));

// Admin pages
const AdminDashboard = lazy(() => import("./admin/Dashboard"));
const Timetable = lazy(() => import("./admin/Timetable"));
const CollegeSettings = lazy(() => import("./admin/CollegeSettings"));
const Teachers = lazy(() => import("./admin/Teachers"));
const TeacherForm = lazy(() => import("./admin/TeacherForm"));
const Holidays = lazy(() => import("./admin/Holidays"));
const AdminAttendance = lazy(() => import("./admin/Attendance"));
const Export = lazy(() => import("./admin/Export"));
const AuditLogs = lazy(() => import("./admin/AuditLogs"));
const AdminProfile = lazy(() => import("./admin/Profile"));
const AdminForm = lazy(() => import("./admin/AdminForm"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// Layout Components
const TeacherLayout = ({ children }) => {
  return (
    <>
      <Navbar role="teacher" />
      <main style={styles.main}>{children}</main>
      <Footer />
    </>
  );
};

const AdminLayout = ({ children }) => {
  return (
    <>
      <Navbar role="admin" />
      <main style={styles.main}>{children}</main>
      <Footer />
    </>
  );
};

const PageLoader = () => <FullPageLoader />;

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Test Route - Place this BEFORE protected routes */}
                <Route path="/firebase-test" element={<FirebaseTest />} />

                {/* Teacher Routes */}
                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherLayout>
                        <TeacherDashboard />
                      </TeacherLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/attendance"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherLayout>
                        <MarkAttendance />
                      </TeacherLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/leave"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherLayout>
                        <MarkLeave />
                      </TeacherLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/history"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherLayout>
                        <History />
                      </TeacherLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/profile"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherLayout>
                        <TeacherProfile />
                      </TeacherLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/college-settings"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <CollegeSettings />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/timetable"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <Timetable />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teachers"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <Teachers />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teachers/add"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <TeacherForm />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teachers/edit/:id"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <TeacherForm />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/holidays"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <Holidays />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/attendance"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AdminAttendance />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/export"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <Export />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AuditLogs />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/profile"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AdminProfile />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/admin-form"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AdminForm />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/admin-form/:id"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout>
                        <AdminForm />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = {
  main: {
    minHeight: "calc(100vh - 140px)",
    padding: "20px",
    backgroundColor: "#f5f5f5"
  }
};

export default App;