import React from 'react';

interface ScoreBarProps {
  label: string;
  value: number; // 0 to 1
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple';
  showPercentage?: boolean;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  value,
  color = 'indigo',
  showPercentage = false,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(value * 100)));

  const colorStyles = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="w-full text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-slate-200 font-mono font-semibold">
          {showPercentage ? `${percentage}%` : value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};


