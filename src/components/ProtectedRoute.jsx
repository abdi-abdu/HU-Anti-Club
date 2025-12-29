import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requireActive = true }) => {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireActive && userProfile?.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Pending</h2>
          <p className="text-gray-600 mb-4">
            Your account is pending approval from the club administrators. 
            You'll receive access once your membership is approved.
          </p>
          <p className="text-sm text-gray-500">
            Status: <span className="font-medium capitalize">{userProfile?.status}</span>
          </p>
        </div>
      </div>
    );
  }

  if (requireAdmin && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;