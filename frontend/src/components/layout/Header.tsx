import React, { useState } from 'react';
import { 
  BellRing, 
  Rocket, 
  RotateCcw, 
  Layers, 
  User, 
  CheckCircle,
  ShieldCheck,
  LogOut,
  Cpu,
  Activity
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, logout } = useAuth();
  const [isAlerting, setIsAlerting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const connStatus = api.getConnectionStatus();

  const triggerSimulateAlert = async () => {
    setIsAlerting(true);
    try {
      await api.simulateAlert();
      setActionNotice("P1 Incident Alert injected! Evaluated via /api/ingest & triage pipeline.");
      if (onRefresh) onRefresh();
    } finally {
      setIsAlerting(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const triggerSimulateDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await api.simulateDeploy();
      setActionNotice(`Service deploy event v2.1.0 processed! Marked ${res.affectedCount} legacy DB fix memories stale.`);
      if (onRefresh) onRefresh();
    } finally {
      setIsDeploying(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleReset = () => {
    if (confirm("Reset demo memory state to initial clean blueprint seed?")) {
      api.resetDemoData();
      if (onRefresh) onRefresh();
      setActionNotice("Demo memory state restored to initial blueprint seed.");
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <header className="h-16 glass-panel border-b border-white/5 px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Workspace & Active Engine Mode */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono bg-[#0f172a]/80 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-slate-300 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Workspace:</span>
          <span className="text-white font-bold">{user?.workspace || 'ws-primary'}</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold font-mono">XYRO101</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
              connStatus.isLiveBackend
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950'
                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-sm shadow-indigo-950'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connStatus.isLiveBackend ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
              }`}
            />
            <span>{connStatus.isLiveBackend ? 'Live Backend (Atlas)' : 'ANCHOR Engine (Governed)'}</span>
          </span>
        </div>
      </div>

      {/* Center Notice Toast */}
      {actionNotice && (
        <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-indigo-950/90 to-[#0e1628]/90 border border-indigo-500/40 px-3.5 py-1 rounded-full text-xs text-indigo-200 animate-fade-in shadow-xl">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium truncate max-w-md">{actionNotice}</span>
        </div>
      )}

      {/* Right: Simulation Controls & User Avatar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          type="button"
          onClick={triggerSimulateAlert}
          disabled={isAlerting}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 transition-all duration-200 shadow-sm hover:shadow-amber-950/50 disabled:opacity-50 active:scale-95"
          title="Simulate incoming incident alert from n8n / monitoring (W1)"
        >
          <BellRing className={`w-3.5 h-3.5 ${isAlerting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isAlerting ? 'Triggering...' : 'Simulate Alert (W1)'}</span>
          <span className="sm:hidden">Alert</span>
        </button>

        <button
          type="button"
          onClick={triggerSimulateDeploy}
          disabled={isDeploying}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 shadow-sm hover:shadow-cyan-950/50 disabled:opacity-50 active:scale-95"
          title="Simulate service deployment event marking outdated memories stale (W2)"
        >
          <Rocket className={`w-3.5 h-3.5 ${isDeploying ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">{isDeploying ? 'Deploying...' : 'Simulate Deploy (W2)'}</span>
          <span className="sm:hidden">Deploy</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/50 transition-all active:scale-95"
          title="Reset demo data to initial clean blueprint seed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* User Card */}
        <div className="flex items-center space-x-2 bg-[#0f172a]/90 px-2.5 py-1 rounded-xl border border-white/5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm uppercase">
            {user?.name ? user.name[0] : 'Y'}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[120px]">
            {user?.name || 'Yashi Aadarsh'}
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 ml-1 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
