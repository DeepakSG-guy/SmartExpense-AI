import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { SplitParticipant } from '../../types/split';
import {
  X,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Smartphone,
  Phone,
  Mail,
  UserCheck,
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your contacts?`)) return;
    try {
      await deleteParticipant(id);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Cannot delete participant' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Friends & Roommates
              </h3>
              <p className="text-xs text-slate-400">
                Manage participants for quick student group expense splitting
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeParticipantModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Add / Edit Form */}
          {isAdding ? (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Contact' : 'Add New Friend / Roommate'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Rohan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    UPI ID (for student payments)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rohan@okhdfc"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Add Friend / Roommate Contact</span>
            </button>
          )}

          {/* List of Contacts */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Registered Contacts ({splitParticipants.length})
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {splitParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: p.avatarColor || '#3B82F6' }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span>{p.name}</span>
                        {p.isCurrentUser && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                            You (Default Payer)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
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
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
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
