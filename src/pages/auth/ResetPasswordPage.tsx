import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, updatePassword, session, isConfigured } = useAuth();
  const { showToast } = useFinance();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  // If user arrives via a recovery link, session is active and they can update password directly
  const isUpdatingExisting = !!session;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMessage(error.message || 'Failed to request password reset.');
      } else {
        setIsSent(true);
        showToast({
          type: 'success',
          message: 'Password reset link sent to your email address.',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setErrorMessage(error.message || 'Failed to update password.');
      } else {
        showToast({ type: 'success', message: 'Password updated successfully! Welcome back.' });
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F2] dark:bg-[#141416] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-[#202020] dark:text-[#F3F4F6] transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] flex items-center justify-center text-[#202020] shadow-[2.5px_2.5px_0px_#202020] group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-transform">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-[#202020] dark:text-white">
                SmartExpense{' '}
                <span className="text-xs font-sans font-extrabold uppercase px-2 py-0.5 rounded-lg bg-[#ADE0BB] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]">
                  AI
                </span>
              </span>
            </div>
          </Link>
        </div>

        <h2 className="mt-6 text-center text-3xl font-serif font-bold text-[#202020] dark:text-white">
          {isUpdatingExisting ? 'Set New Password' : 'Reset password'}
        </h2>
        <p className="mt-1 text-center text-xs text-[#626262] dark:text-slate-400">
          {isUpdatingExisting
            ? 'Enter your new secure password below'
            : 'We’ll email you instructions to reset your account password'}
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1E1E22] py-8 px-6 sm:px-10 border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] rounded-3xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-xs font-medium text-[#202020] dark:text-white flex items-start gap-2.5 shadow-[1.5px_1.5px_0px_#202020]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSent ? (
            <div className="p-5 rounded-2xl bg-[#ADE0BB]/30 border-2 border-[#202020] space-y-3 text-center shadow-[2px_2px_0px_#202020]">
              <div className="w-12 h-12 rounded-2xl bg-[#ADE0BB] border-2 border-[#202020] text-[#202020] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0px_#202020]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#202020] dark:text-white">
                Check your email
              </h3>
              <p className="text-xs text-[#626262] dark:text-slate-300 leading-relaxed">
                We sent a password reset link to <strong>{email}</strong>. Open the link to create a new password.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block py-2 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : isUpdatingExisting ? (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium focus:ring-0 focus:outline-none focus:border-[#202020]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium focus:ring-0 focus:outline-none focus:border-[#202020]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-sm border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium focus:ring-0 focus:outline-none focus:border-[#202020]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isConfigured}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-sm border-2 border-[#202020] shadow-[2.5px_2.5px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Sending link...' : 'Send Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-4 border-t-2 border-[#202020]/10 text-center">
            <Link
              to="/login"
              className="text-xs font-bold text-[#626262] dark:text-slate-400 hover:text-[#202020] dark:hover:text-white"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
