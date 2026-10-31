import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Cpu, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  X,
  ShieldCheck,
  Loader2,
  Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShaktAILogo } from '../../components/common/ShaktAILogo';
import { api, subscribeToWakingState } from '../../services/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('anchor_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('anchor_remember_email'));
  
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [isWaking, setIsWaking] = useState(false);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  
  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToWakingState(setIsWaking);
    return unsub;
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });
          const container = document.getElementById('google-btn-container');
          if (container) {
            setGoogleButtonRendered(true);
          (window as any).google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              width: 350,
              text: 'continue_with',
              shape: 'rectangular'
            });
          }
        }
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError('Google Sign-In failed to retrieve credential token.');
      return;
    }
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
    }
  };

  const handleGoogleClick = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setError('Google OAuth Client ID is not configured (VITE_GOOGLE_CLIENT_ID). You can use email/password authentication or instant demo sign-in.');
      return;
    }
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.warn('Google One Tap not displayed:', notification.getNotDisplayedReason());
          const reason = notification.getNotDisplayedReason();
          if (reason === 'opt_out_or_no_session') {
            setError('Please sign into your Google account first, or sign in with email and password below.');
          } else {
            setError('Google Sign-In prompt was suppressed or domain is unverified. If on a live deployed domain, verify Authorized JavaScript Origins in Google Cloud Console.');
          }
        }
      });
    } else {
      setError('Google Identity Services script is still loading. Please try again.');
    }
  };

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    if (rememberMe) {
      localStorage.setItem('anchor_remember_email', email.trim());
    } else {
      localStorage.removeItem('anchor_remember_email');
    }

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('password')) {
        setError('Incorrect email or password. Please verify your credentials and try again.');
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setError('Server is unreachable. Please verify backend is running on port 5000 or check connection.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotStatus({
        type: 'success',
        message: res.message || 'Password reset link sent! Check your inbox.'
      });
    } catch (err: any) {
      setForgotStatus({
        type: 'error',
        message: err.message || 'Failed to send password reset email.'
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Ambient Celestial Aurora Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/15 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel border border-slate-200/90 rounded-3xl p-8 shadow-xl relative z-10 bg-white backdrop-blur-2xl">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <ShaktAILogo size="lg" glow={true} className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sign in to access your governed ANCHOR workspace.
          </p>
        </div>

        {/* Cold-Start Waking Banner */}
        {isWaking && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs text-amber-300 flex items-center space-x-2.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span>Waking server from cold start... This can take up to a minute.</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-300 flex items-start space-x-2 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="w-full flex justify-center mb-1">
          <div id="google-btn-container" className="w-full flex justify-center min-h-[44px]"></div>
        </div>
        {!googleButtonRendered && (
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 transition-all flex items-center justify-center space-x-3 shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        )}

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">
            or sign in with email
          </span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-700 block mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="name@company.com"
                className={`w-full bg-white border ${
                  validationErrors.email ? 'border-rose-500' : 'border-slate-200'
                } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all`}
              />
            </div>
            {validationErrors.email && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStatus(null);
                  setForgotModalOpen(true);
                }}
                className="text-[11px] text-indigo-600 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={`w-full bg-white border ${
                  validationErrors.password ? 'border-rose-500' : 'border-slate-200'
                } rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Register */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-indigo-600 hover:text-cyan-300 font-semibold underline underline-offset-2">
            Create an account
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-panel border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative bg-white/95">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-1">Reset Your Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your email and we'll send you instructions to reset your password.
            </p>

            {forgotStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start space-x-2 ${
                  forgotStatus.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                }`}
              >
                {forgotStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{forgotStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-700 block mb-1">Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
