import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('yashi@shakti2.io');
  const [password, setPassword] = useState('anchor123');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    }
  };

  const handleDemoLogin = async () => {
    setEmail('yashi@shakti2.io');
    await login('yashi@shakti2.io', 'anchor123');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-md bg-[#111726]/90 backdrop-blur-xl border border-[#1f293d] rounded-3xl p-8 shadow-2xl relative z-10 glow-border-indigo">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/25">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">XYRO101</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            ANCHOR Governed Memory Engine • Team Shakti-2
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@shakti2.io"
                className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access for Hackathon Judges */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-mono font-medium transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>1-Click Hackathon Evaluator Login</span>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need a workspace?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Register new account
          </Link>
        </div>
      </div>
    </div>
  );
};
