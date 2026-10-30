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
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('anchor_remember_email') || 'demo@anchor.io');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('anchor_remember_email'));
  
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  
  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

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
          });
        }
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (response?.credential) {
      try {
        setError(null);
        await loginWithGoogle(response.credential);
        navigate('/');
      } catch (err: any) {
        setError(err?.message || 'Google authentication failed. Please try again.');
      }
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    } else {
      try {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(
          JSON.stringify({
            sub: 'google_oauth_10928374650192837465',
            email: 'alex.chen@anchor.ai',
            name: 'Alex Chen',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            iss: 'https://accounts.google.com',
            aud: 'anchor-client-id'
          })
        );
        const mockCredential = `${header}.${payload}.signature_anchor_google`;
        await loginWithGoogle(mockCredential);
        navigate('/');
      } catch (err: any) {
        setError(err?.message || 'Google Sign-In failed.');
      }
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
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
      setError(err?.message || 'Invalid email or password. Please try again.');
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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <div className="w-full max-w-md bg-[#252525] border border-[#383838] rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(204,139,60,0.15)] border border-[rgba(204,139,60,0.3)] flex items-center justify-center mx-auto mb-4 shadow-lg text-[#cc8b3c]">
            <Cpu className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f0f0f0]">Welcome Back</h1>
          <p className="text-xs text-[#b4b4b4] mt-1.5 font-medium">
            Sign in to continue to your ANCHOR workspace.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[rgba(220,80,80,0.15)] border border-[rgba(220,80,80,0.35)] text-xs text-[#f07070] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#f07070]" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#2e2e2e] hover:bg-[#383838] border border-[#484848] rounded-xl text-xs font-semibold text-[#ececec] transition-all flex items-center justify-center space-x-3 shadow-sm active:scale-95 disabled:opacity-50"
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

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-[#383838]" />
          <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-[#888]">
            or sign in with email
          </span>
          <div className="flex-1 border-t border-[#383838]" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#b4b4b4] block mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#888] absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="name@company.com"
                className={`w-full bg-[#1e1e1e] border ${
                  validationErrors.email ? 'border-rose-500' : 'border-[#484848]'
                } rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#ececec] placeholder-[#888888] focus:outline-none focus:border-[#cc8b3c] transition-colors`}
              />
            </div>
            {validationErrors.email && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono text-[#b4b4b4]">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStatus(null);
                  setForgotModalOpen(true);
                }}
                className="text-[11px] text-[#cc8b3c] hover:text-[#e8a84e] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#888] absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={`w-full bg-[#1e1e1e] border ${
                  validationErrors.password ? 'border-rose-500' : 'border-[#484848]'
                } rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#ececec] placeholder-[#888888] focus:outline-none focus:border-[#cc8b3c] transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#888] hover:text-[#ececec] transition-colors"
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
            <label className="flex items-center space-x-2 text-xs text-[#b4b4b4] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#484848] bg-[#1e1e1e] text-[#cc8b3c] focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Register */}
        <div className="mt-5 text-center text-xs text-[#b4b4b4]">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-[#cc8b3c] hover:text-[#e8a84e] font-semibold underline underline-offset-2">
            Create an account
          </Link>
        </div>

        {/* Demo Fast Login */}
        <div className="mt-6 pt-4 border-t border-[#383838]">
          <button
            type="button"
            onClick={async () => {
              setEmail('demo@anchor.io');
              setPassword('password123');
              await login('demo@anchor.io', 'password123');
              navigate('/');
            }}
            className="w-full py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#e8a84e] border border-[rgba(204,139,60,0.3)] rounded-xl text-[11px] font-mono transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#cc8b3c]" />
            <span>Instant Demo Sign In (demo@anchor.io)</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#252525] border border-[#383838] rounded-2xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="absolute right-4 top-4 text-[#888] hover:text-[#ececec]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-[#f0f0f0] mb-1">Reset Your Password</h3>
            <p className="text-xs text-[#b4b4b4] mb-4">
              Enter your email and we'll send you instructions to reset your password.
            </p>

            {forgotStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start space-x-2 ${
                  forgotStatus.type === 'success'
                    ? 'bg-[rgba(76,175,125,0.15)] border border-[rgba(76,175,125,0.35)] text-[#60d49a]'
                    : 'bg-[rgba(220,80,80,0.15)] border border-[rgba(220,80,80,0.35)] text-[#f07070]'
                }`}
              >
                {forgotStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-[#60d49a] flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#f07070] flex-shrink-0 mt-0.5" />
                )}
                <span>{forgotStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-[#b4b4b4] block mb-1">Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-[#1e1e1e] border border-[#484848] rounded-xl px-3 py-2 text-xs text-[#ececec] placeholder-[#888] focus:outline-none focus:border-[#cc8b3c]"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary w-full py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
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
