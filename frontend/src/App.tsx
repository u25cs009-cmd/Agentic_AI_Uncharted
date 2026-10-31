import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingIndicator } from './components/common/LoadingIndicator';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ChatPage } from './pages/Chat/ChatPage';
import { InspectorPage } from './pages/Inspector/InspectorPage';
import { MemoryExplorerPage } from './pages/MemoryExplorer/MemoryExplorerPage';
import { QuarantinePage } from './pages/Quarantine/QuarantinePage';
import { TimelinePage } from './pages/Timeline/TimelinePage';
import { SettingsPage } from './pages/Settings/SettingsPage';

// Code splitting via dynamic imports for heavy visualization pages
const EntityGraphPage = React.lazy(() => 
  import('./pages/EntityGraph/EntityGraphPage').then(m => ({ default: m.EntityGraphPage }))
);
const BenchmarkPage = React.lazy(() => 
  import('./pages/Benchmark/BenchmarkPage').then(m => ({ default: m.BenchmarkPage }))
);

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main Application Layout */}
            <Route path="/" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
              <Route index element={<ChatPage />} />
              <Route path="inspector" element={<InspectorPage />} />
              <Route path="explorer" element={<MemoryExplorerPage />} />
              <Route path="quarantine" element={<QuarantinePage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route 
                path="entity-graph" 
                element={
                  <Suspense fallback={<LoadingIndicator message="Loading Entity Topology Graph..." className="h-96" />}>
                    <EntityGraphPage />
                  </Suspense>
                } 
              />
              <Route 
                path="benchmark" 
                element={
                  <Suspense fallback={<LoadingIndicator message="Loading 15-Scenario Benchmark Matrix..." className="h-96" />}>
                    <BenchmarkPage />
                  </Suspense>
                } 
              />
              <Route path="settings" element={<SettingsPage />} />

              {/* Protected Profile Route */}
              <Route 
                path="profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

