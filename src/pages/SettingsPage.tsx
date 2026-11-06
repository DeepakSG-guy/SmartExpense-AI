import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  getSupabaseClient,
} from '../services/supabaseClient';
import { SUPPORTED_CURRENCIES, formatMoney, type Category, type CurrencyConfig } from '../types/finance';
import {
  exportJSONBackup,
  restoreJSONBackup,
  exportTransactionsCSV,
  parseTransactionsCSV,
  downloadFile,
} from '../services/backupService';
import { IconRenderer } from '../components/common/IconRenderer';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import {
  Settings,
  User,
  Globe,
  Palette,
  Bell,
  Database,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  ShieldCheck,
  Sparkles,
  FileText,
  AlertTriangle,
  Cloud,
  CloudUpload,
  LogOut,
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';

const CATEGORY_COLORS = [
  '#10B981', '#059669', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#EF4444', '#F97316', '#F59E0B', '#14B8A6', '#64748B'
];

export const SettingsPage: React.FC = () => {
  const { user, profile, signOut, resetPassword } = useAuth();
  const {
    settings,
    updateSettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    transactions,
    accounts,
    loadDemo,
    resetWorkspace,
    showToast,
    aiHealth,
    bulkAddTransactions,
    cloudSyncStatus,
    openMigrationModal,
    syncFromCloud,
  } = useFinance();

  // Local Form States
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [currency, setCurrency] = useState(settings.currency);
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [theme, setTheme] = useState(settings.theme);
  const [warningThreshold, setWarningThreshold] = useState(settings.budgetThresholds?.warning || 75);
  const [dangerThreshold, setDangerThreshold] = useState(settings.budgetThresholds?.danger || 90);
  const [aiBackendUrl, setAiBackendUrl] = useState(settings.aiBackendUrl || '');

  // Supabase Configuration States
  const [supabaseUrl, setSupabaseUrl] = useState(getSupabaseUrl());
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getSupabaseAnonKey());
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState('#10B981');
  const [catIcon, setCatIcon] = useState('Tag');

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[] | null>(null);
  const [csvStats, setCsvStats] = useState<{ valid: number; invalid: number; duplicateCount: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Confirmations
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [confirmLoadDemoOpen, setConfirmLoadDemoOpen] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      displayName: displayName.trim(),
      currency,
      dateFormat,
      theme,
      budgetThresholds: {
        warning: warningThreshold,
        danger: dangerThreshold,
      },
      aiBackendUrl: aiBackendUrl.trim(),
    });
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setTestResult(null);
    try {
      saveCustomSupabaseConfig(supabaseUrl, supabaseAnonKey);
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Please enter a valid Supabase Project URL and Anon Key.');
      }
      const { error } = await client.from('accounts').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('JWT') || error.code === '42501' || error.message?.includes('row-level security')) {
          setTestResult({ success: true, message: 'Connected to Supabase! PostgreSQL RLS is active and protecting tables.' });
        } else {
          throw error;
        }
      } else {
        setTestResult({ success: true, message: 'Connected to Supabase PostgreSQL successfully!' });
      }
      showToast({ type: 'success', message: 'Supabase connection verified!' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
      showToast({ type: 'error', message: 'Failed to connect to Supabase.' });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleResetSupabaseConfig = () => {
    clearCustomSupabaseConfig();
    setSupabaseUrl(getSupabaseUrl());
    setSupabaseAnonKey(getSupabaseAnonKey());
    setTestResult(null);
    showToast({ type: 'info', message: 'Reset Supabase credentials to default configuration.' });
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setIsResettingPass(true);
    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        showToast({ type: 'error', message: error.message || 'Failed to send password reset.' });
      } else {
        showToast({ type: 'success', message: `Password reset email sent to ${user.email}!` });
      }
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    try {
      await syncFromCloud();
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Category CRUD
  const handleOpenCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatType(cat.type);
      setCatColor(cat.color);
      setCatIcon(cat.icon);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatType('expense');
      setCatColor('#10B981');
      setCatIcon('Tag');
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      await updateCategory(editingCat.id, {
        name: catName.trim(),
        type: catType,
        color: catColor,
        icon: catIcon,
      });
    } else {
      await addCategory({
        name: catName.trim(),
        type: catType,
        color: catColor,
        icon: catIcon,
        isDefault: false,
      });
    }
    setIsCatModalOpen(false);
  };

  // Backup Export JSON
  const handleExportJSON = async () => {
    try {
      const jsonStr = await exportJSONBackup();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(jsonStr, `smartexpense-backup-${dateStr}.json`, 'application/json');
      showToast({ type: 'success', message: 'Backup JSON downloaded successfully.' });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Failed to export backup.' });
    }
  };

  // Backup Restore JSON
  const handleRestoreJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const res = await restoreJSONBackup(text, 'replace');
        showToast({ type: 'success', message: res.message });
        window.location.reload();
      } catch (err: any) {
        showToast({ type: 'error', message: err.message || 'Failed to restore backup.' });
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  // CSV Import
  const handleSelectCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseTransactionsCSV(text, transactions, accounts, categories);
      setCsvPreviewRows(parsed.rows);
      setCsvStats({
        valid: parsed.validCount,
        invalid: parsed.invalidCount,
        duplicateCount: parsed.duplicateCount,
      } as any);
    };
    reader.readAsText(file);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleConfirmCSVImport = async () => {
    if (!csvPreviewRows) return;
    setIsImporting(true);

    try {
      const defaultAcc = accounts[0];
      const validRows = csvPreviewRows.filter((r) => r.isValid);

      const payload = validRows.map((r) => {
        let matchedCat = categories.find(
          (c: Category) => c.name.toLowerCase() === (r.categoryName || '').toLowerCase() && c.type === r.type
        );
        let matchedAcc = accounts.find(
          (a) => a.name.toLowerCase() === (r.accountName || '').toLowerCase()
        );

        return {
          title: r.title,
          amount: r.amount,
          type: r.type,
          categoryId: matchedCat?.id || categories.find((c) => c.type === r.type)?.id || '',
          fromAccountId: matchedAcc?.id || defaultAcc?.id || '',
          date: r.date,
          paymentMethod: r.paymentMethod || 'Other',
          notes: r.notes,
        };
      });

      await bulkAddTransactions(payload);
      setCsvPreviewRows(null);
      setCsvStats(null);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'CSV Import failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 0. Cloud Account & Supabase Integration */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#202020]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#CFB0E8] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
                Account & Cloud Sync
              </h2>
              <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">
                Supabase PostgreSQL with Row Level Security (RLS) & cross-device backup
              </p>
            </div>
          </div>
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#ADE0BB] text-[#202020] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Authenticated
            </span>
          )}
        </div>

        {/* User Card or Guest Invitation */}
        {user ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] font-serif font-bold text-xl flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-serif font-bold text-[#202020] dark:text-white text-base">
                    {profile?.displayName || 'SmartExpense User'}
                  </div>
                  <div className="text-xs text-[#626262] dark:text-slate-400 font-medium">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-[#626262] dark:text-slate-500 font-mono mt-0.5">
                    UID: {user.id.substring(0, 18)}...
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingNow}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>{isSyncingNow ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={openMigrationModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Migrate Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={isResettingPass}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E22] hover:bg-[#FBF9F2] text-[#202020] dark:text-white text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                  title="Send password reset link to your email"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFAB83] hover:bg-[#F69C72] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#FFDB8A]/30 border-2 border-[#202020] shadow-[2px_2px_0px_#202020] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-[#202020]" />
                <h3 className="font-serif font-bold text-base text-[#202020] dark:text-white">
                  Local Mode Active (IndexedDB)
                </h3>
              </div>
              <p className="text-xs text-[#626262] dark:text-slate-300 mt-1 max-w-xl">
                Your data is stored securely in your browser. Log in or create an account to enable cloud sync across phones, tablets, and computers.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#1E1E22] hover:bg-[#FBF9F2] text-[#202020] dark:text-white text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        {/* Supabase Custom Configuration */}
        <div className="pt-3 border-t-2 border-[#202020]/10">
          <div className="text-xs font-bold text-[#202020] dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Supabase Connection Settings</span>
            <span className="text-[11px] font-normal text-[#626262] dark:text-slate-400">
              Optional: connect custom Supabase project
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1">
                Anon Public Key
              </label>
              <div className="relative">
                <input
                  type={showAnonKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 text-xs bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#626262] hover:text-[#202020] dark:hover:text-white"
                >
                  {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-xs font-bold text-[#202020] border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                <span>{isTestingSupabase ? 'Testing...' : 'Save & Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetSupabaseConfig}
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#626262] hover:text-[#202020] dark:hover:text-white transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>
            </div>

            {testResult && (
              <div
                className={`text-xs px-3 py-1.5 rounded-xl border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] flex items-center gap-1.5 font-medium ${
                  testResult.success
                    ? 'bg-[#ADE0BB] text-[#202020]'
                    : 'bg-[#FFAB83] text-[#202020]'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-800 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. General Preferences Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-[#202020]/10">
          <div className="w-10 h-10 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              General Preferences
            </h2>
            <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">Currency, theme, and date display</p>
          </div>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Display Name / Profile
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white font-medium focus:outline-none"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c: CurrencyConfig) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white font-medium focus:outline-none"
              >
                <option value="light">Light Theme (Warm Ivory)</option>
                <option value="dark">Dark Theme (Deep Slate)</option>
                <option value="system">Follow System Preference</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-[#202020] dark:text-white font-medium focus:outline-none"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Custom AI Backend URL (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. https://my-finance-ai.run.app (Leave empty to use current host)"
              value={aiBackendUrl}
              onChange={(e) => setAiBackendUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-xs text-[#202020] dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[#626262] dark:text-slate-400">
              Useful when the frontend is hosted statically on GitHub Pages and calls an external Cloud Run backend.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-xs sm:text-sm border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* 2. Custom Categories Manager */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#202020]/10">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
              Category Customization
            </h2>
            <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">Add, edit, or color-code your financial buckets</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCatModal()}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-3 rounded-2xl border-2 border-[#202020] bg-[#FBF9F2] dark:bg-[#141416] shadow-[1.5px_1.5px_0px_#202020] flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#202020] border border-[#202020] flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <IconRenderer name={cat.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-[#202020] dark:text-white truncate block">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-[#626262] dark:text-slate-400 capitalize font-medium">{cat.type}</span>
                </div>
              </div>

              {!cat.isDefault && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenCatModal(cat)}
                    className="p-1 text-[#626262] hover:text-[#202020] dark:hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1 text-[#626262] hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Data Backup, Export & Restore */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-4">
        <div className="pb-3 border-b-2 border-[#202020]/10">
          <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>Data Portability & Complete Backup</span>
          </h2>
          <p className="text-xs text-[#626262] dark:text-slate-400 mt-0.5 font-medium">
            100% of your data belongs to you. Export full JSON snapshots or import existing bank CSV files.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* JSON Backup & Restore */}
          <div className="p-5 rounded-2xl bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-3">
            <span className="font-serif font-bold text-sm text-[#202020] dark:text-white block">
              Complete App Backup (JSON)
            </span>
            <p className="text-xs text-[#626262] dark:text-slate-400">
              Export all accounts, transactions, recurring rules, budgets, goals, and categories in one portable file.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] font-bold text-xs border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white dark:bg-[#1E1E22] hover:bg-[#FBF9F2] text-[#202020] dark:text-white font-bold text-xs border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept="application/json"
                  ref={jsonFileInputRef}
                  className="hidden"
                  onChange={handleRestoreJSONFile}
                />
              </label>
            </div>
          </div>

          {/* CSV Import */}
          <div className="p-5 rounded-2xl bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-3">
            <span className="font-serif font-bold text-sm text-[#202020] dark:text-white block">
              Import Transactions (CSV)
            </span>
            <p className="text-xs text-[#626262] dark:text-slate-400">
              Bulk import transactions from your bank statements or spreadsheet with preview and duplicate check.
            </p>
            <div className="pt-1">
              <label className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] font-bold text-xs border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={csvFileInputRef}
                  className="hidden"
                  onChange={handleSelectCSV}
                />
              </label>
            </div>
          </div>
        </div>

        {/* CSV Preview Drawer / Modal */}
        {csvPreviewRows && (
          <div className="p-5 rounded-2xl bg-[#E5EAFB] dark:bg-[#1E1E2A] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-serif font-bold text-base text-[#202020] dark:text-white">
                  CSV Import Preview
                </span>
                <p className="text-xs text-[#626262] dark:text-slate-300 font-medium">
                  {csvStats?.valid} valid rows ready • {csvStats?.duplicateCount || 0} duplicates detected
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCsvPreviewRows(null)}
                  className="px-3 py-1.5 rounded-xl text-[#626262] dark:text-slate-400 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImporting || csvStats?.valid === 0}
                  onClick={handleConfirmCSVImport}
                  className="px-4 py-2 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] disabled:opacity-40"
                >
                  {isImporting ? 'Importing...' : `Import ${csvStats?.valid} Rows`}
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-[#202020]/10 text-xs">
              {csvPreviewRows.slice(0, 10).map((r, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#202020] dark:text-slate-200">
                      {r.title}
                    </span>
                    <span className="text-[10px] text-[#626262] dark:text-slate-400 block">
                      {r.date} • {r.type} • {r.categoryName || 'General'}
                    </span>
                  </div>
                  <span className="font-serif font-bold text-sm text-[#202020] dark:text-white">
                    {formatMoney(r.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Demo Data & Clean Reset Controls */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E22] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-4">
        <div className="pb-3 border-b-2 border-[#202020]/10">
          <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
            Workspace Management
          </h2>
          <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">
            Switch between demo datasets and clean private production tracking
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmLoadDemoOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#E5EAFB] hover:bg-[#D5DDF8] text-xs font-bold text-[#202020] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-blue-700" />
            <span>Load / Reset Demo Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmCleanOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#FFAB83] hover:bg-[#F69C72] text-xs font-bold text-[#202020] border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-800" />
            <span>Reset to Clean Blank Workspace</span>
          </button>
        </div>
      </div>

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E22] w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-[#202020] my-auto space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#202020] dark:text-white">
              {editingCat ? 'Edit Category' : 'New Custom Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="text-[#626262] dark:text-slate-400 uppercase font-bold block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Books, Freelance"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F2] dark:bg-[#141416] border-2 border-[#202020] rounded-xl text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#626262] dark:text-slate-400 uppercase font-bold block mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#FBF9F2] dark:bg-[#141416] p-1 rounded-xl border-2 border-[#202020]">
                  <button
                    type="button"
                    onClick={() => setCatType('expense')}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      catType === 'expense'
                        ? 'bg-[#FFAB83] text-[#202020] border border-[#202020]'
                        : 'text-[#626262]'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('income')}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      catType === 'income'
                        ? 'bg-[#ADE0BB] text-[#202020] border border-[#202020]'
                        : 'text-[#626262]'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#626262] dark:text-slate-400 uppercase font-bold block mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-7 h-7 rounded-xl border-2 ${
                        catColor === c ? 'border-[#202020] scale-110 shadow-[1px_1px_0px_#202020]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3 py-2 text-[#626262] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ADE0BB] hover:bg-[#9CD3AA] text-[#202020] font-bold text-xs border-2 border-[#202020] shadow-[1.5px_1.5px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Load Demo */}
      <ConfirmDialog
        isOpen={confirmLoadDemoOpen}
        onClose={() => setConfirmLoadDemoOpen(false)}
        onConfirm={loadDemo}
        title="Load Demo Finance Workspace?"
        message="This will populate ~40 realistic transactions, 5 accounts (HDFC, UPI, Cash, Cards), monthly budgets, recurring Netflix/Rent rules, and savings goals."
        confirmText="Load Demo Data"
        confirmVariant="primary"
      />

      {/* Confirm Clean Workspace */}
      <ConfirmDialog
        isOpen={confirmCleanOpen}
        onClose={() => setConfirmCleanOpen(false)}
        onConfirm={resetWorkspace}
        title="Reset to Clean Slate?"
        message="This will clear all transactions, budgets, goals, and custom rules, providing a clean workspace with an opening ₹20,000 primary account."
        confirmText="Reset Workspace"
        confirmVariant="danger"
      />
    </div>
  );
};
