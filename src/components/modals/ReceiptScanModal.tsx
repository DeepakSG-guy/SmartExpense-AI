import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { aiService, type ReceiptScanResult } from '../../services/aiService';
import { toMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Camera, Upload, Sparkles, Check, AlertCircle, FileText } from 'lucide-react';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPopulateTransaction: (data: {
    title: string;
    amount: number;
    date: string;
    categoryId?: string;
    notes?: string;
  }) => void;
}

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  isOpen,
  onClose,
  onPopulateTransaction,
}) => {
  const { categories, aiHealth, settings } = useFinance();
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.INR;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Please upload a valid JPEG, PNG, or WebP image.');
      return;
    }

    setMimeType(file.type);
    setErrorMsg('');
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview) return;
    setErrorMsg('');
    setIsScanning(true);

    try {
      const result = await aiService.scanReceipt(imagePreview, mimeType, categories);
      setScanResult(result);
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Receipt scan failed. Ensure backend has GEMINI_API_KEY configured.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToTransaction = () => {
    if (!scanResult) return;

    let matchedCatId = '';
    if (scanResult.category) {
      const cat = categories.find(
        (c) => c.name.toLowerCase() === scanResult.category?.toLowerCase() && c.type === 'expense'
      );
      if (cat) matchedCatId = cat.id;
    }

    const itemsSummary = scanResult.lineItems && scanResult.lineItems.length > 0
      ? `Items: ${scanResult.lineItems.map((i) => `${i.name} (${currencyConfig.symbol}${i.price})`).join(', ')}`
      : '';

    onPopulateTransaction({
      title: scanResult.merchant || 'Scanned Receipt',
      amount: toMinorUnits(scanResult.amount || 0, currencyConfig.minorUnitDigits),
      date: scanResult.date || new Date().toISOString().split('T')[0],
      categoryId: matchedCatId,
      notes: itemsSummary,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                AI Receipt Scanner
              </h2>
              <p className="text-xs text-slate-500">Extract merchant, total, date & items</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* AI Status notice */}
          {!aiHealth.hasGeminiKey && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Gemini AI backend is not active. You can still preview your receipt image and enter details manually in the transaction ledger.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Upload Area */}
          {!imagePreview ? (
            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click or drop receipt photo
              </span>
              <span className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WebP (up to 10MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 flex items-center justify-center bg-slate-950">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="max-h-56 object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setScanResult(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!scanResult && (
                <button
                  type="button"
                  disabled={isScanning || !aiHealth.hasGeminiKey}
                  onClick={handleScan}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isScanning ? 'Analyzing with Gemini...' : 'Analyze Receipt with Gemini'}
                </button>
              )}
            </div>
          )}

          {/* Extracted Details Review */}
          {scanResult && (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/50 dark:border-emerald-800/50">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Extracted Details (Review)
                </span>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50">
                  Ready to confirm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Merchant</span>
                  <span className="font-semibold text-sm">{scanResult.merchant || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Amount</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {currencyConfig.symbol}{scanResult.amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Date</span>
                  <span>{scanResult.date || 'Today'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Category</span>
                  <span>{scanResult.category || 'General'}</span>
                </div>
              </div>

              {scanResult.lineItems && scanResult.lineItems.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40">
                  <span className="text-slate-400 block text-[10px] uppercase mb-1">
                    Detected Items ({scanResult.lineItems.length})
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {scanResult.lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono">
                          {currencyConfig.symbol}{item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            {scanResult && (
              <button
                type="button"
                onClick={handleApplyToTransaction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
              >
                Populate Transaction Form
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
