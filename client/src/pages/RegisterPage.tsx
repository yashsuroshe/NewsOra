import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/auth.store';
import { AxiosError } from 'axios';

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

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError('');
    try {
      await registerUser(data.name, data.email, data.password);
      navigate('/onboarding');
    } catch (err) {
      const axErr = err as AxiosError<{ error: string }>;
      setServerError(axErr.response?.data?.error ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">NewsOra</h1>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Get started</h2>

          {serverError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { field: 'name' as const, label: 'Full name', type: 'text', placeholder: 'John Doe' },
              { field: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { field: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••' },
              { field: 'confirmPassword' as const, label: 'Confirm password', type: 'password', placeholder: '••••••••' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-1">{label}</label>
                <input
                  {...register(field)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
                {errors[field] && <p className="text-red-400 text-xs mt-1">{errors[field]?.message}</p>}
              </div>
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
