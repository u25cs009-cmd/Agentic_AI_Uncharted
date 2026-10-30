import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPage } from './pages/Chat/ChatPage';
import { InspectorPage } from './pages/Inspector/InspectorPage';
import { MemoryExplorerPage } from './pages/MemoryExplorer/MemoryExplorerPage';
import { QuarantinePage } from './pages/Quarantine/QuarantinePage';
import { TimelinePage } from './pages/Timeline/TimelinePage';
import { EntityGraphPage } from './pages/EntityGraph/EntityGraphPage';
import { BenchmarkPage } from './pages/Benchmark/BenchmarkPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<ChatPage />} />
              <Route path="inspector" element={<InspectorPage />} />
              <Route path="explorer" element={<MemoryExplorerPage />} />
              <Route path="quarantine" element={<QuarantinePage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="entity-graph" element={<EntityGraphPage />} />
              <Route path="benchmark" element={<BenchmarkPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

