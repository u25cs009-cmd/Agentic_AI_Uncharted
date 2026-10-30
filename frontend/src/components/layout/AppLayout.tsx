import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { api } from '../../services/api';

export const AppLayout: React.FC = () => {
  const [quarantineCount, setQuarantineCount] = useState(0);

  const fetchQuarantineCount = async () => {
    try {
      const q = await api.getQuarantinedMemories();
      setQuarantineCount(q.length);
    } catch (e) {}
  };

  useEffect(() => {
    fetchQuarantineCount();
    const interval = setInterval(fetchQuarantineCount, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-app-bg text-app-fg overflow-hidden font-sans">
      <Sidebar quarantineCount={quarantineCount} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header onRefresh={fetchQuarantineCount} />
        <main className="flex-1 overflow-y-auto bg-app-bg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
