import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <Loader2 className="w-6 h-6 text-[#cc8b3c] animate-spin" />
      <span className="text-xs font-mono text-[#b4b4b4]">{message}</span>
    </div>
  );
};
