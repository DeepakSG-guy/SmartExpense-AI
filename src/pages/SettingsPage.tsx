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
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Account & Cloud Database Sync
              </h2>
              <p className="text-xs text-slate-400">
                Supabase PostgreSQL with Row Level Security (RLS) & cross-device backup
              </p>
            </div>
          </div>
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Authenticated
            </span>
          )}
        </div>

        {/* User Card or Guest Invitation */}
        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-base">
                    {profile?.displayName || 'SmartExpense User'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    UID: {user.id.substring(0, 18)}...
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingNow}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>{isSyncingNow ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={openMigrationModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Migrate Local Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={isResettingPass}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  title="Send password reset link to your email"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Local Storage Mode Active (IndexedDB)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Your transactions, accounts, and budgets are currently stored only inside your browser's local IndexedDB. Log in or register to enable cloud synchronization with Supabase PostgreSQL and Row Level Security.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        {/* Supabase Custom Configuration */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Supabase Connection Settings</span>
            <span className="text-[11px] font-normal text-slate-400">
              Optional: connect custom Supabase project
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Anon Public Key
              </label>
              <div className="relative">
                <input
                  type={showAnonKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                <span>{isTestingSupabase ? 'Testing Connection...' : 'Save & Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetSupabaseConfig}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>

            {testResult && (
              <div
                className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. General Preferences Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            General Preferences
          </h2>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Display Name / Profile
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
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
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              >
                <option value="light">Light Theme (Default)</option>
                <option value="dark">Dark Theme</option>
                <option value="system">Follow System Preference</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Custom AI Backend URL (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. https://my-finance-ai.run.app (Leave empty to use current host)"
              value={aiBackendUrl}
              onChange={(e) => setAiBackendUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Useful when the frontend is hosted statically on GitHub Pages and calls an external Cloud Run backend.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* 2. Custom Categories Manager */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Category Customization
            </h2>
            <p className="text-xs text-slate-400">Add, edit, or color-code your financial buckets</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCatModal()}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate block">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">{cat.type}</span>
                </div>
              </div>

              {!cat.isDefault && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenCatModal(cat)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
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
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Data Portability & Complete Backup</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            100% of your data belongs to you. Export full JSON snapshots or import existing bank CSV files.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* JSON Backup & Restore */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="font-bold text-xs uppercase text-slate-600 dark:text-slate-300 block">
              Complete App Backup (JSON)
            </span>
            <p className="text-xs text-slate-400">
              Export all accounts, transactions, recurring rules, budgets, goals, and categories in one portable file.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs cursor-pointer active:scale-95 transition-all">
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
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="font-bold text-xs uppercase text-slate-600 dark:text-slate-300 block">
              Import Transactions (CSV)
            </span>
            <p className="text-xs text-slate-400">
              Bulk import transactions from your bank statements or spreadsheet with preview and duplicate check.
            </p>
            <div className="pt-1">
              <label className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer active:scale-95 transition-all">
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
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  CSV Import Preview
                </span>
                <p className="text-xs text-slate-500">
                  {csvStats?.valid} valid rows ready • {csvStats?.duplicateCount || 0} likely duplicates detected
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCsvPreviewRows(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImporting || csvStats?.valid === 0}
                  onClick={handleConfirmCSVImport}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-40"
                >
                  {isImporting ? 'Importing...' : `Import ${csvStats?.valid} Rows`}
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-blue-200/50 dark:divide-blue-800/50 text-xs">
              {csvPreviewRows.slice(0, 10).map((r, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {r.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {r.date} • {r.type} • {r.categoryName || 'General'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(r.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Demo Data & Clean Reset Controls */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Workspace Management
          </h2>
          <p className="text-xs text-slate-400">
            Switch between demo datasets and clean private production tracking
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmLoadDemoOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            <span>Load / Reset Demo Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmCleanOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Reset to Clean Blank Workspace</span>
          </button>
        </div>
      </div>

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3">
              {editingCat ? 'Edit Category' : 'New Custom Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-semibold block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Books, Freelance"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase font-semibold block mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCatType('expense')}
                    className={`py-1 rounded-md font-semibold ${
                      catType === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-600'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('income')}
                    className={`py-1 rounded-md font-semibold ${
                      catType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-semibold block mb-1">
                  Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        catColor === c ? 'border-slate-900 scale-110' : 'border-transparent'
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
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
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
