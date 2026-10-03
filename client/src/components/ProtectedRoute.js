import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
export default function ProtectedRoute() {
    const { user, accessToken, fetchMe } = useAuthStore();
    useEffect(() => {
        if (accessToken && !user)
            void fetchMe();
    }, [accessToken, user, fetchMe]);
    if (!accessToken)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (accessToken && !user) {
        return (_jsx("div", { className: "min-h-screen bg-gray-950 flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" }) }));
    }
    return _jsx(Outlet, {});
}
