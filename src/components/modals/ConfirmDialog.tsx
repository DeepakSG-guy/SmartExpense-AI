import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText,
  confirmLabel,
  confirmVariant,
  isDestructive,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const isDanger = confirmVariant === 'danger' || isDestructive === true;
  const label = confirmText || confirmLabel || 'Confirm';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#202020]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E22] w-full max-w-sm rounded-3xl border-2 border-[#202020] shadow-[3.5px_3.5px_0px_#202020] p-6 my-auto">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl border-2 border-[#202020] flex items-center justify-center flex-shrink-0 shadow-[1.5px_1.5px_0px_#202020] ${
              isDanger
                ? 'bg-[#FFAB83] text-[#202020]'
                : 'bg-[#FFDB8A] text-[#202020]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#202020] dark:text-white text-lg leading-snug">
              {title}
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-300 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-[#626262] dark:text-slate-400 font-bold text-xs sm:text-sm hover:text-[#202020] dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-[#202020] text-xs sm:text-sm font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${
              isDanger
                ? 'bg-[#FFAB83] hover:bg-[#F69C72]'
                : 'bg-[#ADE0BB] hover:bg-[#9CD3AA]'
            }`}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
};
