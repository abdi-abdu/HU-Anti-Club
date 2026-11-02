import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * ProtectedRoute
 *
 * Props
 *   requireAdmin   — only website admins (role === 'admin') may pass
 *   requireOfficer — website admins OR any active club officer may pass
 *   requireActive  — account must be status === 'active' (default true)
 *
 * "requireAdmin" and "requireOfficer" are mutually exclusive in practice;
 * requireAdmin is the stricter gate.
 *
 * Club position is resolved from positionIndex via usePermissions.
 * While position is still loading we show a spinner to avoid false redirects.
 */
const ProtectedRoute = ({
  children,
  requireAdmin   = false,
  requireOfficer = false,
  requireActive  = true,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { canViewDashboard, loading: permLoading } = usePermissions();

  // 1. Not logged in
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Auth resolved but Firestore user profile still loading
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // 3. Account not active
  if (requireActive && userProfile.status !== 'active') {
    const isDeactivated = userProfile.status === 'deactivated';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isDeactivated ? 'Account Deactivated' : 'Account Pending'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isDeactivated
              ? 'Your membership has been deactivated. Please contact the club administrators for assistance.'
              : "Your account is pending approval from the club administrators. You'll receive access once your membership is approved."
            }
          </p>
          <p className="text-sm text-gray-500">
            Status:{' '}
            <span className="font-medium capitalize">{userProfile.status}</span>
          </p>
        </div>
      </div>
    );
  }

  // 4. Admin-only gate (strictest)
  if (requireAdmin && userProfile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 5. Officer-or-admin gate — wait for position to resolve before redirecting
  if (requireOfficer) {
    if (permLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      );
    }
    if (!canViewDashboard) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
