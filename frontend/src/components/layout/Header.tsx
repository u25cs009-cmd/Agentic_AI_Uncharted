import React, { useState } from 'react';
import {
  BellRing,
  Rocket,
  RotateCcw,
  Layers,
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

  const isLive = api.getConnectionStatus().isLiveBackend;

  return (
    <header
      className="h-10 flex items-center justify-between px-4 shrink-0 border-b border-vsc-border"
      style={{ background: '#323233' }}
    >
      {/* Left: Workspace info */}
      <div className="flex items-center gap-4">
        {/* Workspace badge */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-vsc-fg-dim">
          <Layers className="w-3.5 h-3.5 text-vsc-syn-var" />
          <span>Workspace:</span>
          <span className="text-vsc-syn-var font-semibold">{user?.workspace || 'ws-primary'}</span>
        </div>

        {/* Engine mode */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-vsc-fg-dim">
          <ShieldCheck className="w-3.5 h-3.5 text-vsc-success" />
          <span>XYRO101 Engine</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
              isLive
                ? 'bg-vsc-success/20 text-vsc-success border-vsc-success/40'
                : 'bg-vsc-accent/20 text-vsc-syn-const border-vsc-accent/40'
            }`}
          >
            {isLive ? '● Live' : '● Simulation'}
          </span>
        </div>
      </div>

      {/* Center: Notice toast */}
      {actionNotice && (
        <div className="hidden lg:flex items-center gap-2 bg-vsc-actbar border border-vsc-border px-3 py-1 text-xs text-vsc-fg-dim font-mono">
          <CheckCircle className="w-3.5 h-3.5 text-vsc-success" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Right: Controls + user */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={triggerSimulateAlert}
          disabled={isAlerting}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-vsc-tabbar hover:bg-vsc-highlight text-vsc-syn-str border border-vsc-border transition-colors disabled:opacity-50"
          title="Simulate incoming incident alert"
        >
          <BellRing className={`w-3.5 h-3.5 ${isAlerting ? 'animate-spin' : ''}`} />
          <span>{isAlerting ? 'Alerting...' : 'Simulate Alert'}</span>
        </button>

        <button
          onClick={triggerSimulateDeploy}
          disabled={isDeploying}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-vsc-tabbar hover:bg-vsc-highlight text-vsc-syn-const border border-vsc-border transition-colors disabled:opacity-50"
          title="Simulate service deployment"
        >
          <Rocket className={`w-3.5 h-3.5 ${isDeploying ? 'animate-bounce' : ''}`} />
          <span>{isDeploying ? 'Deploying...' : 'Simulate Deploy'}</span>
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight border border-transparent hover:border-vsc-border transition-colors"
          title="Reset demo data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-vsc-border mx-1" />

        {/* User badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-vsc-actbar border border-vsc-border">
          <div className="w-5 h-5 rounded-full bg-vsc-accent/30 border border-vsc-accent/60 flex items-center justify-center text-vsc-accent text-[10px] font-bold uppercase font-mono">
            {user?.name ? user.name[0] : 'A'}
          </div>
          <span className="text-xs text-vsc-fg hidden sm:inline font-ui">
            {user?.name || 'Ayush Singh'}
          </span>
          <button
            onClick={logout}
            className="text-vsc-fg-dim hover:text-vsc-error p-0.5 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
