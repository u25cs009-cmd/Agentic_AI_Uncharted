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
    <div className="card p-10 text-center flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(204,139,60,0.12)] border border-[rgba(204,139,60,0.25)] flex items-center justify-center text-[#cc8b3c] shadow-[0_0_20px_rgba(204,139,60,0.12)]">
        {icon || <Database className="w-7 h-7 text-[#cc8b3c]" />}
      </div>
      <div className="relative z-10 max-w-md">
        <h4 className="text-base font-semibold text-[#f0f0f0] tracking-tight">{title}</h4>
        <p className="text-xs text-[#b4b4b4] leading-relaxed mt-1.5">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary relative z-10 mt-2 flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
