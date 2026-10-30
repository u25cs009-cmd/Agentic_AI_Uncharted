import React, { useState } from 'react';
import { Bell, Rocket, RotateCcw, CheckCircle2, LogOut, Zap, ShieldCheck } from 'lucide-react';
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

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAlert = async () => {
    setIsAlerting(true);
    try { await api.simulateAlert(); flash('Alert triggered — sent to /api/ingest.'); onRefresh?.(); }
    finally { setIsAlerting(false); }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await api.simulateDeploy();
      flash(`Deploy done — ${res.affectedCount} memories marked stale.`);
      onRefresh?.();
    } finally { setIsDeploying(false); }
  };

  const handleReset = () => {
    if (!confirm('Reset demo to initial state?')) return;
    api.resetDemoData(); onRefresh?.();
    flash('Memory state restored to blueprint seed.');
  };

  const isLive = api.getConnectionStatus().isLiveBackend;

  return (
    <header className="h-14 shrink-0 flex items-center gap-4 px-6 bg-claude-sidebar border-b border-claude-border">

      {/* ── Left: context info ── */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Workspace */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-claude-accent shrink-0" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-claude-fg-3">Workspace</span>
            <span className="text-claude-border">/</span>
            <span className="text-claude-fg font-semibold">{user?.workspace || 'ws-primary'}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-claude-border" />

        {/* Engine mode */}
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-claude-fg-3" />
          <span className="text-sm text-claude-fg-2 font-medium">XYRO101</span>
          <span className={`tag text-[11px] ${isLive ? 'tag-success' : 'tag-info'}`}>
            {isLive ? 'Live' : 'Simulation'}
          </span>
        </div>

        {/* Toast notice */}
        {notice && (
          <div className="hidden lg:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg bg-claude-surface border border-claude-border text-sm text-claude-fg-2 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-claude-success shrink-0" />
            <span className="truncate max-w-xs">{notice}</span>
          </div>
        )}
      </div>

      {/* ── Right: actions + avatar ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Simulate Alert */}
        <button
          onClick={handleAlert}
          disabled={isAlerting}
          className="btn-ghost flex items-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <Bell className={`w-3.5 h-3.5 text-claude-warning ${isAlerting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isAlerting ? 'Alerting…' : 'Simulate Alert'}</span>
        </button>

        {/* Simulate Deploy */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="btn-ghost flex items-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <Rocket className={`w-3.5 h-3.5 text-claude-info ${isDeploying ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">{isDeploying ? 'Deploying…' : 'Simulate Deploy'}</span>
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="p-2 rounded-lg text-claude-fg-3 hover:text-claude-fg hover:bg-claude-elevated transition-all cursor-pointer"
          title="Reset demo data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-px bg-claude-border mx-1" />

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-claude-accent to-claude-accent-light flex items-center justify-center text-white text-sm font-bold shadow-soft">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="text-sm text-claude-fg-2 font-medium hidden md:inline group-hover:text-claude-fg transition-colors">
            {user?.name || 'Ayush'}
          </span>
          <button
            onClick={logout}
            className="p-1 text-claude-fg-3 hover:text-claude-danger transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
