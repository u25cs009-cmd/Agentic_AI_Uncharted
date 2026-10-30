import React, { useState } from 'react';
import { 
  BellRing, 
  Rocket, 
  RotateCcw, 
  Layers, 
  User, 
  CheckCircle,
  ShieldCheck,
  LogOut
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

  const triggerSimulateAlert = async () => {
    setIsAlerting(true);
    try {
      await api.simulateAlert();
      setActionNotice("Simulate Alert triggered! Sent to /api/ingest & triage pipeline.");
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
      setActionNotice(`Simulate Deploy triggered! Marked ${res.affectedCount} legacy DB fix memories stale.`);
      if (onRefresh) onRefresh();
    } finally {
      setIsDeploying(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleReset = () => {
    if (confirm("Reset demo data to initial clean blueprint state?")) {
      api.resetDemoData();
      if (onRefresh) onRefresh();
      setActionNotice("Demo memory state restored to initial blueprint seed.");
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <header className="h-16 bg-[#0a0f1c]/90 backdrop-blur-md border-b border-[#1a2336] px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Left: Workspace & Active Mode */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono bg-[#111827] px-3 py-1.5 rounded-lg border border-[#1e293b] text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Workspace:</span>
          <span className="text-indigo-300 font-semibold">{user?.workspace || 'ws-primary'}</span>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Agent Model:</span>
          <span className="text-slate-200 font-medium">XYRO101 Engine (OpenAI + MongoDB Atlas)</span>
        </div>
      </div>

      {/* Middle Notice Toast */}
      {actionNotice && (
        <div className="hidden lg:flex items-center space-x-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-xs text-indigo-200 animate-fade-in shadow-lg">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Right: Simulation Controls & User */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={triggerSimulateAlert}
          disabled={isAlerting}
          className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all duration-150 disabled:opacity-50"
          title="Simulate incoming incident alert from n8n / monitoring"
        >
          <BellRing className={`w-3.5 h-3.5 ${isAlerting ? 'animate-spin' : ''}`} />
          <span>{isAlerting ? 'Alerting...' : 'Simulate Alert (W1)'}</span>
        </button>

        <button
          onClick={triggerSimulateDeploy}
          disabled={isDeploying}
          className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all duration-150 disabled:opacity-50"
          title="Simulate service deployment event marking outdated memories stale"
        >
          <Rocket className={`w-3.5 h-3.5 ${isDeploying ? 'animate-bounce' : ''}`} />
          <span>{isDeploying ? 'Deploying...' : 'Simulate Deploy (W2)'}</span>
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-700/50 transition-colors"
          title="Reset demo data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        <div className="flex items-center space-x-2 bg-[#111726] px-2.5 py-1 rounded-lg border border-[#1e293b]">
          <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
            {user?.name ? user.name[0] : 'Y'}
          </div>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">
            {user?.name || 'Yashi Aadarsh'}
          </span>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
