import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { aiService, type ReceiptScanResult } from '../../services/aiService';
import { toMinorUnits, SUPPORTED_CURRENCIES } from '../../types/finance';
import { X, Camera, Upload, Sparkles, Check, AlertCircle, FileText } from 'lucide-react';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPopulateTransaction?: (data: {
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

    if (onPopulateTransaction) {
      onPopulateTransaction({
        title: scanResult.merchant || 'Scanned Receipt',
        amount: toMinorUnits(scanResult.amount || 0, currencyConfig.minorUnitDigits),
        date: scanResult.date || new Date().toISOString().split('T')[0],
        categoryId: matchedCatId,
        notes: itemsSummary,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-lg rounded-3xl shadow-2xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#CFB0E8] border-2 border-[#202020] text-[#202020] flex items-center justify-center shadow-[1.5px_1.5px_0px_#202020]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202020] dark:text-white">
                AI Receipt Scanner
              </h2>
              <p className="text-xs text-[#626262] dark:text-slate-400 font-medium">Extract merchant, total, date & items</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#202020]/20 hover:border-[#202020] text-[#202020] dark:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* AI Status notice */}
          {!aiHealth.hasGeminiKey && (
            <div className="p-3.5 rounded-2xl bg-[#FFDB8A]/30 border-2 border-[#202020] text-[#202020] dark:text-slate-200 text-xs flex items-start gap-2.5 shadow-[1.5px_1.5px_0px_#202020]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
              <span>
                Gemini AI backend is not active. You can still preview your receipt image and enter details manually in the transaction ledger.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FFAB83]/20 border-2 border-[#202020] text-[#202020] dark:text-white text-xs font-medium shadow-[1.5px_1.5px_0px_#202020]">
              {errorMsg}
            </div>
          )}

          {/* Upload Area */}
          {!imagePreview ? (
            <label className="border-2 border-dashed border-[#202020] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FBF9F2] dark:hover:bg-[#141416] transition-colors bg-[#FBF9F2]/60 dark:bg-[#141416]/40">
              <div className="w-14 h-14 rounded-2xl bg-[#FFDB8A] border-2 border-[#202020] text-[#202020] flex items-center justify-center mb-3 shadow-[2px_2px_0px_#202020]">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-serif font-bold text-[#202020] dark:text-white">
                Click or drop receipt photo
              </span>
              <span className="text-xs text-[#626262] dark:text-slate-400 mt-1 font-medium">Supports JPEG, PNG, WebP (up to 10MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#202020] shadow-[2px_2px_0px_#202020] max-h-56 flex items-center justify-center bg-black">
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
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-white text-[#202020] border-2 border-[#202020] shadow-[1px_1px_0px_#202020]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!scanResult && (
                <button
                  type="button"
                  disabled={isScanning || !aiHealth.hasGeminiKey}
                  onClick={handleScan}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#CFB0E8] hover:bg-[#BFA0D8] text-[#202020] font-bold text-sm border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{isScanning ? 'Analyzing with Gemini...' : 'Analyze Receipt with Gemini'}</span>
                </button>
              )}
            </div>
          )}

          {/* Extracted Details Review */}
          {scanResult && (
            <div className="p-5 rounded-2xl bg-[#ADE0BB]/30 dark:bg-[#ADE0BB]/10 border-2 border-[#202020] shadow-[2px_2px_0px_#202020] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#202020]/10">
                <span className="font-serif font-bold text-[#202020] dark:text-white text-base">
                  Extracted Details (Review)
                </span>
                <span className="text-[11px] font-bold text-[#202020] px-2 py-0.5 rounded-lg bg-[#ADE0BB] border border-[#202020]">
                  Ready to confirm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[#202020] dark:text-slate-200">
                <div>
                  <span className="text-[#626262] dark:text-slate-400 block text-[10px] font-bold uppercase">Merchant</span>
                  <span className="font-bold text-sm">{scanResult.merchant || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-[#626262] dark:text-slate-400 block text-[10px] font-bold uppercase">Amount</span>
                  <span className="font-serif font-bold text-base text-emerald-800 dark:text-emerald-300">
                    {currencyConfig.symbol}{scanResult.amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-[#626262] dark:text-slate-400 block text-[10px] font-bold uppercase">Date</span>
                  <span className="font-semibold">{scanResult.date || 'Today'}</span>
                </div>
                <div>
                  <span className="text-[#626262] dark:text-slate-400 block text-[10px] font-bold uppercase">Category</span>
                  <span className="font-semibold">{scanResult.category || 'General'}</span>
                </div>
              </div>

              {scanResult.lineItems && scanResult.lineItems.length > 0 && (
                <div className="pt-2 border-t-2 border-[#202020]/10">
                  <span className="text-[#626262] dark:text-slate-400 block text-[10px] font-bold uppercase mb-1">
                    Detected Items ({scanResult.lineItems.length})
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {scanResult.lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] font-medium">
                        <span className="truncate">{item.name}</span>
                        <span className="font-serif font-bold">
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
          <div className="pt-4 border-t-2 border-[#202020]/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[#626262] dark:text-slate-400 font-bold text-sm hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            {scanResult && (
              <button
                type="button"
                onClick={handleApplyToTransaction}
                className="px-5 py-2.5 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD276] text-[#202020] text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
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
