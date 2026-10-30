import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Cpu, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const { register, loginWithGoogle, isLoading } = useAuth();
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
        setError(err?.message || 'Google registration failed.');
      }
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    } else {
      // Direct mock Google flow for demo & hackathon evaluation
      try {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(
          JSON.stringify({
            sub: `google_oauth_${Date.now()}`,
            email: name ? `${name.toLowerCase().replace(/\s+/g, '.')}@anchor.ai` : 'new.operator@anchor.ai',
            name: name || 'Google Verified Operator',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            iss: 'https://accounts.google.com',
            aud: 'anchor-client-id'
          })
        );
        const mockCredential = `${header}.${payload}.signature_anchor_google`;
        await loginWithGoogle(mockCredential);
        navigate('/');
      } catch (err: any) {
        setError(err?.message || 'Google registration failed.');
      }
    }
  };

  const validate = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    try {
      await register(email.trim(), password, name.trim());
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] -top-40 -right-40 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[130px] -bottom-32 -left-32 pointer-events-none" />
      <div className="absolute w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1422]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 glow-border-cyan">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Create Your Account</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Deploy an isolated ANCHOR memory instance for XYRO101
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Continue Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#141b2d] hover:bg-[#1a233b] border border-white/10 hover:border-cyan-400/40 rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center justify-center space-x-3 shadow-md hover:shadow-cyan-950/40 active:scale-95 disabled:opacity-50"
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
          <div className="flex-1 border-t border-slate-800" />
          <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">
            or register with email
          </span>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Full name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="Yashi Aadarsh"
                className={`w-full bg-[#070a12] border ${
                  validationErrors.name ? 'border-rose-500' : 'border-slate-800'
                } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors`}
              />
            </div>
            {validationErrors.name && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="yashi@company.io"
                className={`w-full bg-[#070a12] border ${
                  validationErrors.email ? 'border-rose-500' : 'border-slate-800'
                } rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors`}
              />
            </div>
            {validationErrors.email && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="At least 6 characters"
                className={`w-full bg-[#070a12] border ${
                  validationErrors.password ? 'border-rose-500' : 'border-slate-800'
                } rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.password}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Re-enter password"
                className={`w-full bg-[#070a12] border ${
                  validationErrors.confirmPassword ? 'border-rose-500' : 'border-slate-800'
                } rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{validationErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/30 border border-cyan-400/30 disabled:opacity-50 active:scale-95"
          >
            <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
