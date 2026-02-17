import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Direct imports (no lazy loading for debugging)
import Navbar from "./components/ResponsiveNavbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Import admin components directly
import AdminDashboard from "./admin/Dashboard";
// Comment out other imports for now

const queryClient = new QueryClient();

// Simple AdminLayout
const AdminLayout = ({ children }) => {
  console.log("AdminLayout rendering");
  console.log("Children type:", typeof children);
  console.log("Children:", children);
  
  return (
    <>
      <Navbar role="admin" />
      <main style={{ minHeight: "80vh", padding: "20px", backgroundColor: "#f5f5f5" }}>
        {children}
      </main>
      <Footer />
    </>
  );
};

// Test component
const TestComponent = () => (
  <div style={{ padding: 20, backgroundColor: "white", borderRadius: 8 }}>
    <h2>Test Component</h2>
    <p>If you can see this, basic rendering works!</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* TEST ROUTE 1 - Simple test */}
              <Route 
                path="/test1" 
                element={
                  <AdminLayout>
                    <TestComponent />
                  </AdminLayout>
                } 
              />
              
              {/* TEST ROUTE 2 - Admin Dashboard */}
              <Route
                path="/test2"
                element={
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                }
              />
              
              {/* Original route */}
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
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;