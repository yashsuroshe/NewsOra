import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    defaultOptions: { queries: { staleTime: 60000, retry: 1 } },
});
export default function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(OAuthCallbackPage, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/chat", element: _jsx(ChatPage, {}) }), _jsx(Route, { path: "/preferences", element: _jsx(PreferencesPage, {}) }), _jsx(Route, { path: "/briefings", element: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Briefings" }), _jsx("p", { className: "text-gray-400", children: "Your briefing history will appear here." })] }) }), _jsx(Route, { path: "/alerts", element: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Alerts" }), _jsx("p", { className: "text-gray-400", children: "Real-time alerts will appear here when high-importance news breaks." })] }) })] }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }));
}
