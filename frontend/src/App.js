import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Admin from './pages/Admin';
import { SubscriptionSuccess, SubscriptionCancel } from './pages/Subscription';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <div className="text-brand-win text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Landing />
              )
            }
          />
          <Route
            path="/auth"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Auth onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/history"
            element={
              isAuthenticated ? (
                <History onLogout={handleLogout} />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated ? (
                <Admin />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/subscription/success"
            element={
              isAuthenticated ? (
                <SubscriptionSuccess />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/subscription/cancel"
            element={
              isAuthenticated ? (
                <SubscriptionCancel />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
