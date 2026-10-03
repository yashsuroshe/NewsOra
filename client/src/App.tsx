import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages — will be filled in subsequent parts
const DashboardPage = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-brand-600 mb-2">NewsOra</h1>
      <p className="text-gray-500">AI News Intelligence — Dashboard coming soon</p>
    </div>
  </div>
);

const LoginPage = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-2">Login</h1>
      <p className="text-gray-500">Auth UI coming in Part 4</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* More routes added per part */}
      </Routes>
    </BrowserRouter>
  );
}
