import axios from 'axios';
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
    withCredentials: true, // Send httpOnly refresh token cookie
    timeout: 30000,
});
// Attach access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
// Auto-refresh on 401
let refreshing = null;
api.interceptors.response.use((res) => res, async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        if (!refreshing) {
            refreshing = api
                .post('/auth/refresh')
                .then((r) => {
                const t = r.data.data.accessToken;
                localStorage.setItem('access_token', t);
                return t;
            })
                .catch(() => {
                localStorage.removeItem('access_token');
                window.location.href = '/login';
                return null;
            })
                .finally(() => { refreshing = null; });
        }
        const newToken = await refreshing;
        if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
        }
    }
    return Promise.reject(err);
});
export default api;
