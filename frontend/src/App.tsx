import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverStudentsPage } from './pages/DiscoverStudentsPage';
import { DiscoverRequestsPage } from './pages/DiscoverRequestsPage';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { OffersPage } from './pages/OffersPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { SkillsAvailabilityPage } from './pages/SkillsAvailabilityPage';
import { CollegeVerificationPage } from './pages/CollegeVerificationPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AiMatchPage } from './pages/AiMatchPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/match" element={<AiMatchPage />} />
        <Route path="/ai/match" element={<Navigate to="/match" replace />} />
        <Route path="/discover/ai" element={<Navigate to="/match" replace />} />

        {/* Authenticated Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover/students"
          element={
            <ProtectedRoute>
              <DiscoverStudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover/requests"
          element={
            <ProtectedRoute>
              <DiscoverRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/new"
          element={
            <ProtectedRoute requireVerified>
              <CreateRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/mine"
          element={
            <ProtectedRoute>
              <MyRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offers"
          element={
            <ProtectedRoute>
              <OffersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <ProtectedRoute>
              <TaskDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/skills"
          element={
            <ProtectedRoute>
              <SkillsAvailabilityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <CollegeVerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <PublicProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
