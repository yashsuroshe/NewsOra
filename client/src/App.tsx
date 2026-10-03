import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import PreferencesPage from './pages/PreferencesPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/preferences" element={<PreferencesPage />} />
              {/* Placeholder pages for briefings and alerts (full UI in next iteration) */}
              <Route path="/briefings" element={
                <div className="max-w-3xl mx-auto px-4 py-8">
                  <h1 className="text-2xl font-bold text-white mb-4">Briefings</h1>
                  <p className="text-gray-400">Your briefing history will appear here.</p>
                </div>
              } />
              <Route path="/alerts" element={
                <div className="max-w-3xl mx-auto px-4 py-8">
                  <h1 className="text-2xl font-bold text-white mb-4">Alerts</h1>
                  <p className="text-gray-400">Real-time alerts will appear here when high-importance news breaks.</p>
                </div>
              } />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
