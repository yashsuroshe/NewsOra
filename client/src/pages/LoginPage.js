import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/auth.store';
const loginSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required'),
});
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [serverError, setServerError] = useState('');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(loginSchema),
    });
    const onSubmit = async (data) => {
        setServerError('');
        try {
            await login(data.email, data.password);
            navigate('/dashboard');
        }
        catch (err) {
            const axErr = err;
            setServerError(axErr.response?.data?.error ?? 'Login failed. Please try again.');
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-950 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-white", children: "NewsOra" }), _jsx("p", { className: "text-gray-400 mt-2", children: "Your AI-powered news briefing" })] }), _jsxs("div", { className: "bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl", children: [_jsx("h2", { className: "text-xl font-semibold text-white mb-6", children: "Sign in" }), serverError && (_jsx("div", { className: "mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm", children: serverError })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Email" }), _jsx("input", { ...register('email'), type: "email", className: "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition", placeholder: "you@example.com" }), errors.email && _jsx("p", { className: "text-red-400 text-xs mt-1", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: "Password" }), _jsx("input", { ...register('password'), type: "password", className: "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }), errors.password && _jsx("p", { className: "text-red-400 text-xs mt-1", children: errors.password.message })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition", children: isSubmitting ? 'Signing in...' : 'Sign in' })] }), _jsxs("div", { className: "relative my-6", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-700" }) }), _jsx("div", { className: "relative flex justify-center", children: _jsx("span", { className: "bg-gray-900 px-3 text-sm text-gray-500", children: "or" }) })] }), _jsxs("a", { href: `${API_URL}/auth/google`, className: "flex items-center justify-center gap-3 w-full border border-gray-700 rounded-lg py-2.5 text-white hover:bg-gray-800 transition", children: [_jsxs("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", children: [_jsx("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), _jsx("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), _jsx("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), _jsx("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] }), "Continue with Google"] }), _jsxs("p", { className: "text-center text-sm text-gray-500 mt-6", children: ["Don't have an account?", ' ', _jsx(Link, { to: "/register", className: "text-blue-400 hover:text-blue-300", children: "Sign up" })] })] })] }) }));
}
