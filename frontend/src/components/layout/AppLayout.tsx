import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { api } from '../../services/api';

// Map routes to "tab" labels like VS Code tabs
const ROUTE_LABELS: Record<string, string> = {
  '/':              'Chat Agent',
  '/inspector':     'Retrieval Inspector',
  '/explorer':      'Memory Explorer',
  '/quarantine':    'Quarantine Inbox',
  '/timeline':      'Timeline & Time Travel',
  '/entity-graph':  'Entity Graph',
  '/benchmark':     '15-Benchmark Suite',
  '/settings':      'Settings & Simulator',
};

export const AppLayout: React.FC = () => {
  const [quarantineCount, setQuarantineCount] = useState(0);
  const location = useLocation();

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

  const activeLabel = ROUTE_LABELS[location.pathname] ?? 'XYRO101';

  return (
    <div className="flex h-screen bg-vsc-editor text-vsc-fg overflow-hidden font-ui">
      {/* VS Code Sidebar */}
      <Sidebar quarantineCount={quarantineCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Header / top bar */}
        <Header onRefresh={fetchQuarantineCount} />

        {/* Tab strip like VS Code */}
        <div className="flex items-end bg-vsc-tabbar border-b border-vsc-border overflow-x-auto shrink-0" style={{ minHeight: 35 }}>
          <div className="vsc-tab active">
            <span className="text-vsc-syn-fn text-xs">⬥</span>
            <span className="text-xs font-ui text-vsc-fg-hi">{activeLabel}.tsx</span>
          </div>
        </div>

        {/* Breadcrumb bar */}
        <div className="vsc-breadcrumb shrink-0">
          <span>XYRO101</span>
          <span className="text-vsc-border">›</span>
          <span>src</span>
          <span className="text-vsc-border">›</span>
          <span className="text-vsc-fg">{activeLabel}</span>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-vsc-editor p-5">
          <Outlet />
        </main>

        {/* VS Code Status Bar */}
        <div className="vsc-statusbar shrink-0">
          <span>⎇ ayush</span>
          <span>●</span>
          <span>XYRO101 Engine</span>
          <span className="ml-auto">UTF-8</span>
          <span>TypeScript React</span>
          <span>Ln 1, Col 1</span>
        </div>
      </div>
    </div>
  );
};
