import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { HomePage } from './pages/HomePage';
import { GamesPage } from './pages/GamesPage';
import { WingoGamePage } from './pages/WingoGamePage';
import { AviatorGamePage } from './pages/AviatorGamePage';
import { TeenPattiGamePage } from './pages/TeenPattiGamePage';
import { HistoryPage } from './pages/HistoryPage';
import { WalletPage } from './pages/WalletPage';
import { ProfilePage } from './pages/ProfilePage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <BrowserRouter>
            <Routes>
              {/* Separate Locked Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />

              {/* Player Gaming Platform Routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/games/wingo" element={<WingoGamePage />} />
                <Route path="/games/aviator" element={<AviatorGamePage />} />
                <Route path="/games/teen-patti" element={<TeenPattiGamePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
