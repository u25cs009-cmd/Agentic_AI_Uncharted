import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Rocket, RotateCcw, CheckCircle2, LogOut, ShieldCheck, User, Loader2 } from 'lucide-react';
import { api, subscribeToWakingState } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ShaktAILogo } from '../common/ShaktAILogo';

interface HeaderProps {
  onRefresh?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onToggleSidebar,
  isSidebarOpen = true
}) => {
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
    <header className="h-16 shrink-0 flex items-center justify-between gap-3 px-4 lg:px-6 bg-[#FFFDF6]/95 backdrop-blur-md border-b border-amber-200/80 z-20 shadow-2xs">
      {/* ── Left: 3-Line Menu Button & Context ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* 3-Line Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300 text-amber-950 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-2 group"
          title="Toggle Command Center Modules (3-Line Menu)"
          aria-label="Toggle navigation sections"
        >
          {/* 3 Horizontal Lines */}
          <div className="flex flex-col justify-between w-4 h-3.5">
            <span className="block h-0.5 w-full bg-amber-950 rounded-full transition-transform group-hover:bg-amber-800" />
            <span className="block h-0.5 w-full bg-amber-950 rounded-full transition-opacity group-hover:bg-amber-800" />
            <span className="block h-0.5 w-full bg-amber-950 rounded-full transition-transform group-hover:bg-amber-800" />
          </div>
          <span className="hidden sm:inline text-xs font-bold text-amber-950 font-sans tracking-wide">
            Modules
          </span>
        </button>

        {/* Brand / Engine Pill with New Vector Logo */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs shadow-2xs">
          <ShaktAILogo size="xs" />
          <span className="text-amber-950 font-bold tracking-tight">ShaktAI</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
            isLive
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {isLive ? 'MongoDB Live' : 'Demo Sandbox'}
          </span>
        </div>

        {/* Workspace indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="text-amber-900/60 font-medium">Workspace:</span>
          <span className="text-amber-950 font-semibold font-mono">{user?.workspace || 'ws-primary'}</span>
        </div>

        {/* Waking server status banner */}
        {isWaking && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs animate-pulse font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
            <span className="whitespace-nowrap">Waking the server...</span>
          </div>
        )}

        {/* Toast notification banner */}
        {notice && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs shadow-xs animate-fade-in font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{notice}</span>
          </div>
        )}
      </div>

      {/* ── Right: Simulation quick actions & User profile ── */}
      <div className="flex items-center gap-2">
        {/* Simulate P1 Alert */}
        <button
          onClick={handleAlert}
          disabled={isAlerting}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/70 text-amber-950 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          title="Simulate high-priority P1 incident alert"
        >
          <Bell className={`w-3.5 h-3.5 text-amber-700 ${isAlerting ? 'animate-bounce' : ''}`} />
          <span>Alert</span>
        </button>

        {/* Simulate Deploy */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/70 text-amber-950 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          title="Simulate microservice deployment event"
        >
          <Rocket className={`w-3.5 h-3.5 text-amber-700 ${isDeploying ? 'animate-spin' : ''}`} />
          <span>Deploy</span>
        </button>

        {/* Baseline Reset */}
        <button
          onClick={handleReset}
          className="p-2 rounded-xl text-amber-900/70 hover:text-amber-950 hover:bg-amber-100/80 transition-colors cursor-pointer"
          title="Reset memories to initial baseline"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-amber-200/80 mx-1" />

        {/* User Profile / Logout */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-100/60 hover:bg-amber-200/70 border border-amber-300/60 transition-colors"
              title="View profile & security"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline text-xs font-medium text-amber-950 max-w-[100px] truncate">
                {user.name || user.email.split('@')[0]}
              </span>
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};
