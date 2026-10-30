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
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans relative selection:bg-cyan-500/30 selection:text-white">
      {/* Ambient Celestial Aurora Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none z-0" />
      <div className="fixed top-[20%] right-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none z-0" />

      <Sidebar quarantineCount={quarantineCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header onRefresh={fetchQuarantineCount} />
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
