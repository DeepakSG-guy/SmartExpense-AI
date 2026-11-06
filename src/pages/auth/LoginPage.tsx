import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Laptop,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle, isConfigured } = useAuth();
  const { showToast } = useFinance();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message || 'Failed to start Google Sign-In.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during Google Sign-In.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Failed to authenticate. Please check your credentials.');
      } else {
        showToast({ type: 'success', message: 'Signed in successfully! Connecting to your cloud records.' });
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F2] dark:bg-[#141416] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#202020] dark:text-[#F5F5F7] transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* App Logo */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FFDB8A] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] flex items-center justify-center text-[#202020]">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-[#202020] dark:text-white flex items-center gap-1.5">
                SmartExpense{' '}
                <span className="text-[10px] font-sans font-bold text-[#202020] bg-[#CFB0E8] px-2 py-0.5 rounded-lg border border-[#202020]">
                  AI
                </span>
              </span>
              <p className="text-[11px] font-medium text-[#626262] dark:text-slate-400">Personal Wealth Copilot</p>
            </div>
          </Link>
        </div>

        <h2 className="mt-6 text-center font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#202020] dark:text-white">
          Sign In to Your Account
        </h2>
        <p className="mt-1 text-center text-xs text-[#626262] dark:text-slate-400">
          Sync your personal finances seamlessly across devices with Supabase
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card-retro py-8 px-5 sm:px-8 space-y-6">
          {/* Supabase unconfigured warning banner */}
          {!isConfigured && (
            <div className="p-3.5 rounded-2xl bg-[#FFDB8A]/40 border-[1.5px] border-[#202020] text-xs text-[#202020] font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#202020]" />
              <div>
                <strong>Supabase Not Configured:</strong> Set credentials in{' '}
                <Link to="/settings" className="underline font-bold">
                  Settings
                </Link>{' '}
                or continue in offline local mode.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FFAB83]/40 border-[1.5px] border-[#202020] text-xs font-bold text-[#202020] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#202020]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Continue with Google OAuth */}
          <div>
            <button
              type="button"
              disabled={isGoogleLoading || !isConfigured}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-[1.5px] border-[#202020] bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] text-[#202020] dark:text-white font-bold text-xs sm:text-sm shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-[1.5px] border-[#202020]/15 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#1E1E23] px-3 text-[#626262] font-bold text-[10px]">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400">
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs font-bold text-[#202020] dark:text-white hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#626262] hover:text-[#202020]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isConfigured}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-sm shadow-[2.5px_2.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Links & Local Mode */}
          <div className="pt-4 border-t-[1.5px] border-[#202020]/15 dark:border-slate-800 space-y-3 text-center">
            <p className="text-xs font-medium text-[#626262] dark:text-slate-400">
              Don’t have an account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-[#202020] dark:text-white hover:underline"
              >
                Create an account
              </Link>
            </p>

            <div className="pt-1">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#626262] hover:text-[#202020] dark:hover:text-white py-1 px-3 rounded-lg hover:bg-[#F8F5EC] transition-colors"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Continue in Local Offline Mode</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-[#626262] dark:text-slate-400 text-center">
          <ShieldCheck className="w-4 h-4 text-[#2B7A49]" />
          <span>Protected with PostgreSQL Row Level Security (RLS)</span>
        </div>
      </div>
    </div>
  );
};
