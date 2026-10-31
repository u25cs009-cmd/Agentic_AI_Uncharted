import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Rocket, RotateCcw, CheckCircle2, LogOut, Zap, ShieldCheck, User, Sparkles, Loader2 } from 'lucide-react';
import { api, subscribeToWakingState } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isAlerting, setIsAlerting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const unsub = subscribeToWakingState(setIsWaking);
    return unsub;
  }, []);

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
    <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/90 z-10">
      {/* ── Left: Context information ── */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Workspace */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold font-mono">{user?.workspace || 'ws-primary'}</span>
          </div>
        </div>

        {/* Engine mode pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <img src="/logo.jpg" alt="Logo" className="w-4 h-4 rounded-md object-cover border border-slate-200" />
          <span className="text-slate-900 font-semibold">ShaktAI</span>
          <span className={`tag text-[10px] ${isLive ? 'tag-success' : 'tag-accent'}`}>
            {isLive ? 'MongoDB Live' : 'High-Fidelity Sandbox'}
          </span>
        </div>

        {/* Waking server status banner (C5) */}
        {isWaking && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
            <span className="font-semibold whitespace-nowrap">Waking the server, this can take up to a minute</span>
          </div>
        )}

        {/* Toast notification banner */}
        {notice && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs shadow-xs animate-fade-in font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{notice}</span>
          </div>
        )}
      </div>

      {/* ── Right: Simulation quick actions & User profile ── */}
      <div className="flex items-center gap-2.5">
        {/* Simulate P1 Alert */}
        <button
          onClick={handleAlert}
          disabled={isAlerting}
          className="btn-ghost flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl disabled:opacity-50"
          title="Simulate high-priority P1 incident alert"
        >
          <Bell className={`w-3.5 h-3.5 text-amber-600 ${isAlerting ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">Simulate Alert</span>
        </button>

        {/* Simulate Deploy */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="btn-ghost flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl disabled:opacity-50"
          title="Simulate v2.0 deployment webhook (triggers dependency invalidation)"
        >
          <Rocket className={`w-3.5 h-3.5 text-indigo-600 ${isDeploying ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">Simulate Deploy</span>
        </button>

        {/* Reset State */}
        <button
          onClick={handleReset}
          className="btn-ghost p-2 rounded-xl text-slate-500 hover:text-slate-900"
          title="Restore baseline memory blueprint"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* User Account / Authentication */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-900 hidden md:inline truncate max-w-[120px]">
                {user.name || user.email.split('@')[0]}
              </span>
            </Link>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              to="/login"
              className="btn-primary text-xs font-semibold py-1.5 px-3.5 rounded-xl shadow-xs"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
