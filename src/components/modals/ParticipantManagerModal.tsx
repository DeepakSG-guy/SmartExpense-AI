import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { SplitParticipant } from '../../types/split';
import {
  X,
  Users,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Phone,
  Mail,
  Smartphone,
} from 'lucide-react';

export const ParticipantManagerModal: React.FC = () => {
  const {
    isParticipantModalOpen,
    closeParticipantModal,
    splitParticipants,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    showToast,
  } = useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isParticipantModalOpen) return null;

  const resetForm = () => {
    setName('');
    setUpiId('');
    setPhone('');
    setEmail('');
    setEditingId(null);
    setIsAdding(false);
    setErrorMessage('');
  };

  const handleStartEdit = (p: SplitParticipant) => {
    setEditingId(p.id);
    setName(p.name);
    setUpiId(p.upiId || '');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }

    try {
      if (editingId) {
        await updateParticipant(editingId, {
          name: name.trim(),
          upiId: upiId.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });
      } else {
        await addParticipant({
          name: name.trim(),
          upiId: upiId.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          isCurrentUser: false,
        });
      }
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    if (!confirm(`Are you sure you want to remove "${contactName}" from your contacts?`)) return;
    try {
      await deleteParticipant(id);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Cannot delete participant' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-[#FBF9F2] dark:bg-[#1E1E22] border-2 border-[#202020] rounded-3xl max-w-lg w-full shadow-[5px_5px_0px_#202020] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b-2 border-[#202020] flex items-center justify-between bg-white dark:bg-[#28282D]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#CFB0E8] border-2 border-[#202020] text-[#202020] flex items-center justify-center font-bold shadow-[2px_2px_0px_#202020]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#202020] dark:text-white text-base">
                Friends & Roommates
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Manage contacts for group expense splitting & UPI settlements
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeParticipantModal}
            className="w-8 h-8 rounded-full border-2 border-[#202020] bg-white dark:bg-[#1E1E22] text-[#202020] dark:text-white flex items-center justify-center hover:bg-[#FFDB8A] transition-colors shadow-[1.5px_1.5px_0px_#202020] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Add / Edit Form */}
          {isAdding ? (
            <form onSubmit={handleSubmit} className="p-4.5 rounded-2xl bg-white dark:bg-[#28282D] border-2 border-[#202020] shadow-[3px_3px_0px_#202020] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-bold text-[#202020] dark:text-white">
                  {editingId ? 'Edit Contact' : 'Add New Friend / Roommate'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-neutral-500 hover:text-[#202020] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-[#FFAB83]/20 border-2 border-[#202020] text-xs font-bold text-[#202020] dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#202020] dark:text-white uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Rohan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium text-[#202020] dark:text-white focus:outline-none shadow-[2px_2px_0px_#202020]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#202020] dark:text-white uppercase mb-1">
                    UPI ID (for payments)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rohan@okhdfc"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium text-[#202020] dark:text-white focus:outline-none shadow-[2px_2px_0px_#202020]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#202020] dark:text-white uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBF9F2] dark:bg-[#1E1E22] border-2 border-[#202020] rounded-xl text-xs font-medium text-[#202020] dark:text-white focus:outline-none shadow-[2px_2px_0px_#202020]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FFDB8A] hover:bg-[#FCD269] text-[#202020] text-xs font-bold border-2 border-[#202020] shadow-[2px_2px_0px_#202020] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
                >
                  {editingId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-[#202020] hover:bg-[#FFDB8A]/25 text-[#202020] dark:text-white text-xs font-bold transition-all cursor-pointer bg-white/60 dark:bg-[#28282D]/60"
            >
              <Plus className="w-4 h-4 text-[#202020] dark:text-white" />
              <span>Add Friend / Roommate Contact</span>
            </button>
          )}

          {/* List of Contacts */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider px-1">
              Registered Contacts ({splitParticipants.length})
            </div>

            <div className="space-y-2">
              {splitParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border-2 border-[#202020] bg-white dark:bg-[#28282D] shadow-[2px_2px_0px_#202020] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-[#202020] flex items-center justify-center text-white font-serif font-bold text-sm flex-shrink-0 shadow-[1.5px_1.5px_0px_#202020]"
                      style={{ backgroundColor: p.avatarColor || '#3B82F6' }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#202020] dark:text-white flex items-center gap-1.5 truncate">
                        <span>{p.name}</span>
                        {p.isCurrentUser && (
                          <span className="text-[10px] bg-[#ADE0BB] text-[#202020] border border-[#202020] px-1.5 py-0.2 rounded-full font-bold">
                            You (Default Payer)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 flex-wrap mt-0.5">
                        {p.upiId && <span className="font-mono">UPI: {p.upiId}</span>}
                        {p.phone && <span>• {p.phone}</span>}
                      </div>
                    </div>
                  </div>

                  {!p.isCurrentUser && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 text-neutral-600 hover:text-[#202020] dark:text-neutral-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-neutral-600 hover:text-rose-600 dark:text-neutral-400 rounded-lg transition-colors cursor-pointer"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
