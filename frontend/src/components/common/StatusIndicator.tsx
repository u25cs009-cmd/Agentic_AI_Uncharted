import React from 'react';

interface StatusIndicatorProps {
  status: 'active' | 'stale' | 'quarantined' | 'superseded' | 'expired' | 'healthy' | 'live';
  label?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
}) => {
  const config = {
    active: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Active' },
    healthy: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Healthy' },
    live: { bg: 'bg-cyan-500', text: 'text-cyan-400', label: 'Live' },
    stale: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Stale' },
    quarantined: { bg: 'bg-rose-500', text: 'text-rose-400', label: 'Quarantined' },
    superseded: { bg: 'bg-slate-500', text: 'text-slate-400', label: 'Superseded' },
    expired: { bg: 'bg-slate-600', text: 'text-slate-500', label: 'Expired' },
  };

  const curr = config[status] || config.active;

  return (
    <div className="inline-flex items-center space-x-1.5 font-mono text-xs">
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${curr.bg}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${curr.bg}`} />
      </span>
      <span className={`${curr.text} font-medium`}>{label || curr.label}</span>
    </div>
  );
};
