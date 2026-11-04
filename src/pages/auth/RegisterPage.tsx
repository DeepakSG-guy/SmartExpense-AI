import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  Zap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { signUp, signInWithGoogle, isConfigured } = useAuth();
  const { showToast } = useFinance();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message || 'Failed to start Google registration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during Google Sign-In.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Password validation rules
  const isLengthValid = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const isPasswordValid = isLengthValid && hasNumber && hasLetter;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, fullName.trim());
      if (error) {
        setErrorMessage(error.message || 'Failed to create account.');
      } else {
        setIsSuccess(true);
        showToast({
          type: 'success',
          message: 'Account created! Please check your email to verify.',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F2] dark:bg-[#141416] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#202020] dark:text-[#F5F5F7] transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
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
          Create Your Account
        </h2>
        <p className="mt-1 text-center text-xs text-[#626262] dark:text-slate-400">
          Start syncing your finances securely to the cloud with Supabase
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card-retro py-8 px-5 sm:px-8 space-y-6">
          {!isConfigured && (
            <div className="p-3.5 rounded-2xl bg-[#FFDB8A]/40 border-[1.5px] border-[#202020] text-xs text-[#202020] font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#202020]" />
              <div>
                <strong>Supabase Not Configured:</strong> Cloud accounts require credentials in{' '}
                <Link to="/settings" className="underline font-bold">
                  Settings
                </Link>.
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="p-5 rounded-2xl bg-[#ADE0BB]/30 border-[1.5px] border-[#202020] space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#ADE0BB] border-[1.5px] border-[#202020] text-[#202020] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0px_#202020]">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#202020] dark:text-white">
                Registration Successful!
              </h3>
              <p className="text-xs text-[#626262] dark:text-slate-300 leading-relaxed font-medium">
                We sent a verification link to <strong>{email}</strong>. Once confirmed, you can log in to sync and back up your finances.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-xs shadow-[2px_2px_0px_#202020]"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                    Or register with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Carter"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 8 characters, letters & numbers"
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#626262] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isConfigured}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-sm shadow-[2.5px_2.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              <div className="pt-4 border-t-[1.5px] border-[#202020]/15 dark:border-slate-800 text-center">
                <p className="text-xs font-medium text-[#626262] dark:text-slate-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-[#202020] dark:text-white hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-[#626262] dark:text-slate-400 text-center">
          <ShieldCheck className="w-4 h-4 text-[#2B7A49]" />
          <span>Protected with PostgreSQL Row Level Security (RLS)</span>
        </div>
      </div>
    </div>
  );
};
