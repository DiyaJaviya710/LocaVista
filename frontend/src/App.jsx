import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import BestLocations from './pages/BestLocations';
import Compare from './pages/Compare';
import Reports from './pages/Reports';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans text-slate-900">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-md shadow-blue-600/30">
            <span className="text-base font-extrabold text-white">LV</span>
            <div className="absolute -inset-1.5 rounded-2xl border-2 border-dashed border-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-900">Verifying session credentials...</p>
            <p className="text-[10px] font-semibold text-blue-600">Spatial AI Security</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public Home Page & About Page */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        {/* Guest Authentication Pages */}
        <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
        <Route path="/register" element={<PublicAuthRoute><Register /></PublicAuthRoute>} />

        {/* Private Protected Pages */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/best-locations" element={<ProtectedRoute><BestLocations /></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}


