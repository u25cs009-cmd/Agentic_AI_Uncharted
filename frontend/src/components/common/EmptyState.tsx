import React from 'react';
import { Database, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="glass-panel p-10 text-center flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
        {icon || <Database className="w-7 h-7 text-indigo-400" />}
      </div>
      <div className="relative z-10 max-w-md">
        <h4 className="text-base font-semibold text-white tracking-tight">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="relative z-10 mt-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
