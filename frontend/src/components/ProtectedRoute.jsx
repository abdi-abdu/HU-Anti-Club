import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requireActive = true }) => {
  const { currentUser, userProfile } = useAuth();

  // Not logged in → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Auth resolved but Firestore profile is still loading
  // Show a spinner rather than incorrectly redirecting
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Account not yet approved or deactivated
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

  // Trying to access admin route without admin role → back to home
  if (requireAdmin && userProfile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
