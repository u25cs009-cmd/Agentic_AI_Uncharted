import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BellRing, 
  Rocket, 
  RotateCcw, 
  Layers, 
  User as UserIcon, 
  CheckCircle,
  LogOut,
  Cpu,
  LogIn,
  ChevronDown,
  MessageSquare,
  Settings,
  Shield,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [isAlerting, setIsAlerting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const connStatus = api.getConnectionStatus();

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="h-16 glass-panel border-b border-white/5 px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 backdrop-blur-xl">
      {/* Left: Workspace & Active Engine Mode */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono bg-[#0f172a]/80 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-slate-300 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Workspace:</span>
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

      {/* Right: Simulation Controls & User Auth Section */}
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

        {/* AUTH BUTTON OR USER PROFILE MENU */}
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all duration-200 active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 bg-[#0f172a]/90 hover:bg-[#151f38] px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-indigo-500/40 transition-all duration-150 active:scale-95"
              aria-expanded={menuOpen}
              aria-label="User profile menu"
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-6 h-6 rounded-lg object-cover border border-indigo-400/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm uppercase">
                  {user?.name ? user.name[0] : 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[110px]">
                {user?.name || 'Operator'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111726]/95 backdrop-blur-2xl border border-[#22304d] rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1">
                  <div className="flex items-center space-x-2.5">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover border border-indigo-400/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {user?.name ? user.name[0] : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{user?.name || 'Operator'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-800/40">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {user?.workspace || 'ws-primary'}
                    </span>
                    {user?.authProviders?.includes('google') ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                        <span>Google</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        Local
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="space-y-0.5 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/70 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/chat?conversations=open"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/70 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>My Conversations</span>
                  </Link>

                  <Link
                    to="/profile?tab=settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/70 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>
                </div>

                <div className="my-1 border-t border-slate-800/80" />

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
