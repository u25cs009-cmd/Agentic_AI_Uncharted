import React, { useState } from 'react';
import { BellRing, Rocket, RotateCcw, CheckCircle, ShieldCheck, LogOut, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, logout } = useAuth();
  const [isAlerting, setIsAlerting]   = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [notice, setNotice]           = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const triggerSimulateAlert = async () => {
    setIsAlerting(true);
    try {
      await api.simulateAlert();
      showNotice('Alert triggered — sent to /api/ingest & triage pipeline.');
      onRefresh?.();
    } finally { setIsAlerting(false); }
  };

  const triggerSimulateDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await api.simulateDeploy();
      showNotice(`Deploy triggered — marked ${res.affectedCount} memories stale.`);
      onRefresh?.();
    } finally { setIsDeploying(false); }
  };

  const handleReset = () => {
    if (confirm('Reset demo data to initial state?')) {
      api.resetDemoData();
      onRefresh?.();
      showNotice('Memory state restored to blueprint seed.');
    }
  };

  const isLive = api.getConnectionStatus().isLiveBackend;

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-5 bg-app-surface border-b border-app-border">

      {/* LEFT — workspace + engine status */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-app-accent" />
          <span className="text-app-fg-muted">Workspace:</span>
          <span className="text-app-fg font-semibold">{user?.workspace || 'ws-primary'}</span>
        </div>

        <div className="h-4 w-px bg-app-border" />

        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-app-accent" />
          <span className="text-app-fg-muted">XYRO101 Engine</span>
          <span className={`tag font-mono ${isLive ? 'tag-accent' : 'tag-info'}`}>
            {isLive ? '● Live' : '● Simulation'}
          </span>
        </div>
      </div>

      {/* CENTER — toast notice */}
      {notice && (
        <div className="hidden lg:flex items-center gap-2 bg-app-elevated border border-app-border rounded px-3 py-1.5 text-xs text-app-fg-muted animate-fade-in">
          <CheckCircle className="w-3.5 h-3.5 text-app-accent shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* RIGHT — actions + user */}
      <div className="flex items-center gap-2">
        <button
          onClick={triggerSimulateAlert}
          disabled={isAlerting}
          className="btn-ghost flex items-center gap-1.5 disabled:opacity-40"
        >
          <BellRing className={`w-3.5 h-3.5 text-app-warning ${isAlerting ? 'animate-spin' : ''}`} />
          <span>{isAlerting ? 'Alerting…' : 'Simulate Alert'}</span>
        </button>

        <button
          onClick={triggerSimulateDeploy}
          disabled={isDeploying}
          className="btn-ghost flex items-center gap-1.5 disabled:opacity-40"
        >
          <Rocket className={`w-3.5 h-3.5 text-app-info ${isDeploying ? 'animate-bounce' : ''}`} />
          <span>{isDeploying ? 'Deploying…' : 'Simulate Deploy'}</span>
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 text-app-fg-muted hover:text-app-fg hover:bg-app-elevated rounded border border-transparent hover:border-app-border transition-colors"
          title="Reset demo data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-app-border mx-1" />

        {/* User */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-app-elevated border border-app-border">
          <div className="w-5 h-5 rounded-full bg-app-accent-bg border border-app-accent/40 flex items-center justify-center text-app-accent text-[10px] font-bold font-mono uppercase">
            {user?.name?.[0] ?? 'A'}
          </div>
          <span className="text-xs text-app-fg hidden sm:inline">{user?.name || 'Ayush'}</span>
          <button onClick={logout} className="text-app-fg-muted hover:text-app-danger transition-colors ml-0.5" title="Log out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
