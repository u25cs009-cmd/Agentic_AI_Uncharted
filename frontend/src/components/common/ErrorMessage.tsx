import React from 'react';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  code?: string | number;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'An error occurred',
  message,
  code,
  onRetry,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        role="alert"
        className={`flex items-center justify-between p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 ${className}`}
      >
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            {code && <strong className="font-mono mr-1">[{code}]</strong>}
            {message}
          </span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center space-x-1 ml-3 px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors font-mono font-medium text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`bg-rose-950/30 border border-rose-500/40 rounded-2xl p-5 shadow-lg ${className}`}
    >
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white tracking-tight">{title}</h4>
            {code && (
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                CODE: {code}
              </span>
            )}
          </div>
          <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">{message}</p>

          {onRetry && (
            <div className="mt-3.5 pt-3 border-t border-rose-500/20 flex justify-end">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Operation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


