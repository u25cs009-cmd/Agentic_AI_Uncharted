import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Calendar, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  Layers, 
  MessageSquare, 
  Database, 
  Sparkles,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
];

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, logout, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = searchParams.get('tab') || 'profile';

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password edit state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stats state
  const [conversationCount, setConversationCount] = useState<number>(0);
  const [memoryCount, setMemoryCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setProfilePicture(user.profilePicture || '');
    }
  }, [user]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const convs = await api.getConversations();
        setConversationCount(convs.length);
        const mems = await api.getMemories();
        setMemoryCount(mems.length);
      } catch {}
    };
    loadStats();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileNotice({ type: 'error', message: 'Display name cannot be empty' });
      return;
    }

    setProfileLoading(true);
    setProfileNotice(null);
    try {
      await updateProfile({
        name: displayName.trim(),
        profilePicture: profilePicture.trim() || undefined
      });
      setProfileNotice({ type: 'success', message: 'Profile details successfully updated' });
      await refreshUser();
    } catch (err: any) {
      setProfileNotice({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordNotice({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    setPasswordNotice(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordNotice({ type: 'success', message: 'Your password has been securely updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordNotice({ type: 'error', message: err.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      user,
      exportedAt: new Date().toISOString(),
      stats: { conversationCount, memoryCount }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anchor_user_profile_${user?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 shadow-2xl border-cyan-500/25 bg-slate-950/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={user?.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/40 uppercase">
                  {user?.name ? user.name[0] : 'U'}
                </div>
              )}
              <div className="dot-live absolute -bottom-1 -right-1 border-2 border-slate-900" />
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user?.name || 'ANCHOR Operator'}
                </h1>
                <Badge variant="cyan" size="sm" glow>
                  Verified
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{user?.email}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-800 flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>Workspace: {user?.workspace || 'ws-primary'}</span>
                </span>
                {user?.authProviders?.includes('google') ? (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/35 flex items-center space-x-1">
                    <span>Google OAuth</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 flex items-center space-x-1">
                    <span>Email &amp; Password</span>
                  </span>
                )}
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-900/80 text-slate-400 border border-slate-800 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleLogout}
              className="btn-danger flex items-center space-x-2 text-xs font-semibold shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 flex items-center space-x-3.5 shadow-xl border-cyan-500/20">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-slate-400">Chat Conversations</p>
            <p className="text-xl font-bold text-white font-mono">{conversationCount} Sessions</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center space-x-3.5 shadow-xl border-indigo-500/20">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-slate-400">Active Memories</p>
            <p className="text-xl font-bold text-white font-mono">{memoryCount} Records</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center space-x-3.5 shadow-xl border-emerald-500/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-slate-400">Security Clearance</p>
            <p className="text-xl font-bold text-emerald-400">Governed Hot Tier</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'profile' })}
          className={`pb-3 flex items-center space-x-2 transition-all relative ${
            activeTab === 'profile'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile Information</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'security' })}
          className={`pb-3 flex items-center space-x-2 transition-all relative ${
            activeTab === 'security'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Security &amp; Password</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'workspace' })}
          className={`pb-3 flex items-center space-x-2 transition-all relative ${
            activeTab === 'workspace'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Workspace &amp; Isolation</span>
        </button>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="glass-panel p-6 shadow-xl space-y-6 rounded-2xl border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Edit Profile Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Update your display name and profile avatar across ANCHOR and XYRO101.
            </p>
          </div>

          {profileNotice && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                profileNotice.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
              }`}
            >
              {profileNotice.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{profileNotice.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Operator Name"
                required
                className="w-full max-w-lg bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full max-w-lg bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed opacity-75"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Email is verified and linked to your workspace identity.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Avatar Image URL</label>
              <div className="flex items-center space-x-3 max-w-lg">
                <input
                  type="url"
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                {profilePicture && (
                  <button
                    type="button"
                    onClick={() => setProfilePicture('')}
                    className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Avatar Presets Selection */}
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 mb-2 font-mono">Or select a preset avatar:</p>
                <div className="flex items-center space-x-2.5">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfilePicture(url)}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all active:scale-95 cursor-pointer ${
                        profilePicture === url ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary"
              >
                {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="glass-panel p-6 shadow-xl space-y-6 rounded-2xl border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Password &amp; Authentication Security</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your password and authentication methods for this account.
            </p>
          </div>

          {passwordNotice && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                passwordNotice.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
              }`}
            >
              {passwordNotice.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{passwordNotice.message}</span>
            </div>
          )}

          {user?.authProviders?.includes('google') && !user?.authProviders?.includes('local') ? (
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 max-w-lg">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Google OAuth Managed Account</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Your account is securely managed via Google OAuth. To set a standalone password for email sign-in, enter your desired password below.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            {(!user?.authProviders?.includes('google') || user?.authProviders?.includes('local')) && (
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Workspace & Isolation */}
      {activeTab === 'workspace' && (
        <div className="glass-panel p-6 shadow-xl space-y-6 rounded-2xl border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Tenant &amp; Data Isolation</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ANCHOR enforces multi-tenant isolation across all memory vectors and audit events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <p className="text-[11px] font-mono text-slate-400">User Identification</p>
              <p className="text-sm font-mono text-white mt-1 font-bold">{user?.id || 'usr-shakti2'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <p className="text-[11px] font-mono text-slate-400">Isolated Workspace Bucket</p>
              <p className="text-sm font-mono text-cyan-300 mt-1 font-bold">{user?.workspace || 'ws-primary'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleExportData}
              className="btn-ghost flex items-center space-x-2"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export User Profile &amp; Records (JSON)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
