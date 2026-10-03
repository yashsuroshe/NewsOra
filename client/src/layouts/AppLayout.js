import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { io } from 'socket.io-client';
export default function AppLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    // Connect Socket.io for real-time alerts
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token)
            return;
        const socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:4000', { auth: { token }, transports: ['websocket'] });
        socket.on('alert', (alert) => {
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
    return (_jsxs("div", { className: "min-h-screen bg-gray-950 flex", children: [_jsxs("aside", { className: "w-56 flex-shrink-0 border-r border-gray-800 flex flex-col py-6 px-3", children: [_jsxs("div", { className: "px-3 mb-8", children: [_jsx("h1", { className: "text-xl font-bold text-white", children: "NewsOra" }), _jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: user?.name })] }), _jsxs("nav", { className: "flex-1 space-y-1", children: [_jsx(NavLink, { to: "/dashboard", className: ({ isActive }) => `${navItem} ${isActive ? active : inactive}`, children: "\uD83C\uDFE0 Dashboard" }), _jsx(NavLink, { to: "/chat", className: ({ isActive }) => `${navItem} ${isActive ? active : inactive}`, children: "\uD83D\uDCAC Chat" }), _jsx(NavLink, { to: "/briefings", className: ({ isActive }) => `${navItem} ${isActive ? active : inactive}`, children: "\uD83D\uDCF0 Briefings" }), _jsx(NavLink, { to: "/alerts", className: ({ isActive }) => `${navItem} ${isActive ? active : inactive}`, children: "\uD83D\uDD14 Alerts" }), _jsx(NavLink, { to: "/preferences", className: ({ isActive }) => `${navItem} ${isActive ? active : inactive}`, children: "\u2699\uFE0F Preferences" })] }), _jsx("button", { onClick: () => void handleLogout(), className: "px-3 py-2 text-sm text-gray-500 hover:text-red-400 transition text-left", children: "Sign out" })] }), _jsx("main", { className: "flex-1 overflow-y-auto", children: _jsx(Outlet, {}) }), alerts.length > 0 && (_jsx("div", { className: "fixed bottom-4 right-4 space-y-2 z-50", children: alerts.map((a) => (_jsx("div", { className: "bg-gray-900 border border-gray-700 rounded-xl p-4 w-80 shadow-2xl", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-blue-400 font-medium", children: a.topic }), _jsx("p", { className: "text-sm text-white mt-1 line-clamp-2", children: a.title })] }), _jsx("button", { onClick: () => setAlerts((prev) => prev.filter((x) => x._id !== a._id)), className: "text-gray-500 hover:text-white ml-2 text-xs", children: "\u2715" })] }) }, a._id))) }))] }));
}
