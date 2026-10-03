import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { io, Socket } from 'socket.io-client';

interface Alert { _id: string; title: string; topic: string; importance: number; }

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Connect Socket.io for real-time alerts
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket: Socket = io(
      import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:4000',
      { auth: { token }, transports: ['websocket'] },
    );

    socket.on('alert', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 4)]);
      // Auto-dismiss after 8s
      setTimeout(() => setAlerts((prev) => prev.filter((a) => a._id !== alert._id)), 8000);
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItem = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition';
  const active = 'bg-gray-800 text-white';
  const inactive = 'text-gray-400 hover:text-white hover:bg-gray-800';

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-800 flex flex-col py-6 px-3">
        <div className="px-3 mb-8">
          <h1 className="text-xl font-bold text-white">NewsOra</h1>
          <p className="text-xs text-gray-500 mt-0.5">{user?.name}</p>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLink to="/dashboard" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            🏠 Dashboard
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            💬 Chat
          </NavLink>
          <NavLink to="/briefings" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            📰 Briefings
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            🔔 Alerts
          </NavLink>
          <NavLink to="/preferences" className={({ isActive }) => `${navItem} ${isActive ? active : inactive}`}>
            ⚙️ Preferences
          </NavLink>
        </nav>

        <button
          onClick={() => void handleLogout()}
          className="px-3 py-2 text-sm text-gray-500 hover:text-red-400 transition text-left"
        >
          Sign out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Toast Alerts */}
      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {alerts.map((a) => (
            <div
              key={a._id}
              className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-80 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-blue-400 font-medium">{a.topic}</span>
                  <p className="text-sm text-white mt-1 line-clamp-2">{a.title}</p>
                </div>
                <button
                  onClick={() => setAlerts((prev) => prev.filter((x) => x._id !== a._id))}
                  className="text-gray-500 hover:text-white ml-2 text-xs"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
