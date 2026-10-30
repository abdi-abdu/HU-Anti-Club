import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
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
  if (currentUser && userProfile) {
    return <Navigate to={userProfile.role === 'admin' ? '/admin' : '/profile'} replace />;
  }
  return children;
};

// Wraps a route in admin ProtectedRoute
const AdminRoute = ({ children }) => (
  <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>
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

          {/* ── Admin routes ─────────────────────────────────────────────
              All specific sub-paths MUST come before the dynamic :tab route
              so React Router matches them first.
          ──────────────────────────────────────────────────────────────── */}
          <Route path="/admin"                  element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/members"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/leadership"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/events"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/posts"            element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/announcements"    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/messages"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/:tab"             element={<AdminRoute><AdminDashboard /></AdminRoute>} />

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
