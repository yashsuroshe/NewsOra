import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function ProtectedRoute() {
  const { user, accessToken, fetchMe } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) void fetchMe();
  }, [accessToken, user, fetchMe]);

  if (!accessToken) return <Navigate to="/login" replace />;

  if (accessToken && !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}
