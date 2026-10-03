import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
/** Handles redirect from /api/v1/auth/google/callback?token=<accessToken> */
export default function OAuthCallbackPage() {
    const [params] = useSearchParams();
    const { setTokenFromOAuth } = useAuthStore();
    const navigate = useNavigate();
    useEffect(() => {
        const token = params.get('token');
        const error = params.get('code');
        if (error) {
            navigate(`/login?error=${error}`);
            return;
        }
        if (token) {
            setTokenFromOAuth(token);
            navigate('/dashboard');
        }
        else {
            navigate('/login?error=OAUTH_FAILED');
        }
    }, [params, setTokenFromOAuth, navigate]);
    return (_jsx("div", { className: "min-h-screen bg-gray-950 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-gray-400", children: "Completing sign in..." })] }) }));
}
