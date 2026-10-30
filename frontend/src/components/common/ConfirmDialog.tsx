import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          {isDestructive && (
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};


