import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { api, subscribeToBackendStatus, BackendStatus } from '../../services/api';
import { AlertTriangle, RefreshCw, Radio } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [quarantineCount, setQuarantineCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ waking: false, unavailable: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  useEffect(() => {
    const unsubscribe = subscribeToBackendStatus((status) => {
      setBackendStatus(status);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex h-screen bg-[#FEFDF8] text-slate-900 overflow-hidden font-sans relative selection:bg-amber-200 selection:text-amber-950 flex-col">
      {/* Cold-Start Waking Banner */}
      {backendStatus.waking && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-xs font-medium flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
            <span>Backend instance is waking up from idle on Render free tier. Retrying automatically...</span>
          </div>
          <span className="font-mono text-[11px] text-amber-700 font-bold">Connecting...</span>
        </div>
      )}

      {/* Backend Unavailable Banner (when not waking) */}
      {!backendStatus.waking && backendStatus.unavailable && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-2xs z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Backend unavailable: Live ANCHOR Memory Engine connection could not be established. No fabricated data will be shown.</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-mono text-[11px] font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* App Body with warm yellowish SaaS Accents */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <div className="fixed top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-amber-400/8 blur-[130px] pointer-events-none z-0" />
        <div className="fixed top-[15%] right-[-10%] w-[650px] h-[650px] rounded-full bg-yellow-300/8 blur-[150px] pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-amber-500/6 blur-[140px] pointer-events-none z-0" />

        {/* Command Center Sidebar with Toggle Support */}
        <Sidebar
          quarantineCount={quarantineCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          <Header
            onRefresh={fetchQuarantineCount}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            isSidebarOpen={isSidebarOpen}
          />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 bg-[#FEFDF8]/60">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
