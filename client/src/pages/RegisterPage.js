import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/auth.store';
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
export default function RegisterPage() {
    const navigate = useNavigate();
    const { register: registerUser } = useAuthStore();
    const [serverError, setServerError] = useState('');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(registerSchema),
    });
    const onSubmit = async (data) => {
        setServerError('');
        try {
            await registerUser(data.name, data.email, data.password);
            navigate('/onboarding');
        }
        catch (err) {
            const axErr = err;
            setServerError(axErr.response?.data?.error ?? 'Registration failed. Please try again.');
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-950 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-white", children: "NewsOra" }), _jsx("p", { className: "text-gray-400 mt-2", children: "Create your account" })] }), _jsxs("div", { className: "bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl", children: [_jsx("h2", { className: "text-xl font-semibold text-white mb-6", children: "Get started" }), serverError && (_jsx("div", { className: "mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm", children: serverError })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [[
                                    { field: 'name', label: 'Full name', type: 'text', placeholder: 'John Doe' },
                                    { field: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
                                    { field: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                                    { field: 'confirmPassword', label: 'Confirm password', type: 'password', placeholder: '••••••••' },
                                ].map(({ field, label, type, placeholder }) => (_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-400 mb-1", children: label }), _jsx("input", { ...register(field), type: type, placeholder: placeholder, className: "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" }), errors[field] && _jsx("p", { className: "text-red-400 text-xs mt-1", children: errors[field]?.message })] }, field))), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition", children: isSubmitting ? 'Creating account...' : 'Create account' })] }), _jsxs("p", { className: "text-center text-sm text-gray-500 mt-6", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "text-blue-400 hover:text-blue-300", children: "Sign in" })] })] })] }) }));
}
