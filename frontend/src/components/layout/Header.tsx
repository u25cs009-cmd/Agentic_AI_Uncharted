import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Rocket, RotateCcw, CheckCircle2, LogOut, Zap, ShieldCheck, User, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isAlerting, setIsAlerting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAlert = async () => {
    setIsAlerting(true);
    try { 
      await api.simulateAlert(); 
      flash('P1 Incident Alert triggered — routed through /api/ingest.'); 
      onRefresh?.(); 
    } finally { 
      setIsAlerting(false); 
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await api.simulateDeploy();
      flash(`Deploy webhook event triggered — ${res.affectedCount} memories invalidated.`);
      onRefresh?.();
    } finally { 
      setIsDeploying(false); 
    }
  };

  const handleReset = () => {
    if (!confirm('Reset memory state to initial blueprint seed?')) return;
    api.resetDemoData(); 
    onRefresh?.();
    flash('Memory state restored to verified baseline.');
  };

  const isLive = api.getConnectionStatus().isLiveBackend;

  return (
    <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 bg-slate-950/70 backdrop-blur-2xl border-b border-slate-800/80 z-10">
      {/* ── Left: Context information ── */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Workspace */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs shadow-sm">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Workspace</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold font-mono">{user?.workspace || 'ws-primary'}</span>
          </div>
        </div>

        {/* Engine mode pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-200 font-medium">XYRO101</span>
          <span className={`tag text-[10px] ${isLive ? 'tag-success' : 'tag-accent'}`}>
            {isLive ? 'MongoDB Live' : 'High-Fidelity Sandbox'}
          </span>
        </div>

        {/* Toast notification banner */}
        {notice && (
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate max-w-sm">{notice}</span>
          </div>
        )}
      </div>

      {/* ── Right: Action buttons & Auth ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Simulate Alert */}
        <button
          onClick={handleAlert}
          disabled={isAlerting}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold hover:border-amber-500/40 hover:text-amber-300 transition-all cursor-pointer"
        >
          <Bell className={`w-3.5 h-3.5 text-amber-400 ${isAlerting ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{isAlerting ? 'Alerting…' : 'Simulate Alert'}</span>
        </button>

        {/* Simulate Deploy */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="btn-ghost flex items-center gap-2 text-xs font-semibold hover:border-cyan-500/40 hover:text-cyan-300 transition-all cursor-pointer"
        >
          <Rocket className={`w-3.5 h-3.5 text-cyan-400 ${isDeploying ? 'animate-bounce' : ''}`} />
          <span className="hidden md:inline">{isDeploying ? 'Deploying…' : 'Simulate Deploy'}</span>
        </button>

        {/* Reset Demo Data */}
        <button
          onClick={handleReset}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700"
          title="Reset demo data to initial seed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        {/* Authentication: Sign In button OR User Profile menu */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-1">
            <Link
              to="/profile"
              className="flex items-center gap-2.5 group cursor-pointer"
              title="Go to Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-cyan-400/40 group-hover:scale-105 transition-transform">
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors hidden md:inline">
                {user.name}
              </span>
            </Link>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_18px_rgba(6,182,212,0.35)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
