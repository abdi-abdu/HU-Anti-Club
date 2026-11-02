import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import About from './pages/About';
import Events from './pages/Events';
import Blog from './pages/Blog';
import Resources from './pages/Resources';
import Help from './pages/Help';
import Profile from './pages/Profile';
import AdminDashboard from './pages/Admin/Dashboard';

// Redirects logged-in users away from guest-only pages
const GuestRoute = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const { canViewDashboard } = usePermissions();
  if (currentUser && userProfile) {
    // Admins and club officers go to the dashboard; everyone else to profile
    const dest = (userProfile.role === 'admin' || canViewDashboard) ? '/admin' : '/profile';
    return <Navigate to={dest} replace />;
  }
  return children;
};

// Admin-only route (website administrators)
const AdminRoute = ({ children }) => (
  <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>
);

// Officer-or-admin route (admins + any active club officer)
const OfficerRoute = ({ children }) => (
  <ProtectedRoute requireOfficer={true}>{children}</ProtectedRoute>
);

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Guest-only routes */}
          <Route path="/"         element={<GuestRoute><Home /></GuestRoute>} />
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Public routes */}
          <Route path="/about"     element={<About />} />
          <Route path="/events"    element={<Events />} />
          <Route path="/blog"      element={<Blog />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/help"      element={<Help />} />

          {/* Protected student route */}
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          {/* ── Dashboard routes ────────────────────────────────────────────
              Specific sub-paths listed before the dynamic :tab catch-all.
              Admin-only sections use AdminRoute.
              Sections accessible to club officers use OfficerRoute.
          ──────────────────────────────────────────────────────────────── */}

          {/* Overview: any officer or admin */}
          <Route path="/admin"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Members: all five roles can view; edit/deactivate gated inside component */}
          <Route path="/admin/members"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Leadership: admin + supervisor (enforced inside Leadership.jsx too) */}
          <Route path="/admin/leadership"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Events: all officers can access (create/cancel/delete gated inside) */}
          <Route path="/admin/events"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Posts: all officers access; delete/approve gated inside */}
          <Route path="/admin/posts"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Announcements: all officers */}
          <Route path="/admin/announcements"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Help Messages: admin + president/vp/secretary (not supervisor) */}
          <Route path="/admin/messages"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Activity Log: all five roles */}
          <Route path="/admin/activity"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Generic fallback for any other /admin/:tab */}
          <Route path="/admin/:tab"
            element={<OfficerRoute><AdminDashboard /></OfficerRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
