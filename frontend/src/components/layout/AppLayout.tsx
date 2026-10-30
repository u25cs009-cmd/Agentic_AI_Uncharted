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
    } catch {}
  };

  useEffect(() => {
    fetchQuarantineCount();
    const interval = setInterval(fetchQuarantineCount, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Background Radial Glow Accents */}
      <div className="absolute top-0 left-64 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-cyan-500/8 rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="absolute top-1/2 left-1/3 w-[400px] h-[300px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none -z-0" />

      <Sidebar quarantineCount={quarantineCount} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden z-10">
        <Header onRefresh={fetchQuarantineCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 cyber-grid">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
