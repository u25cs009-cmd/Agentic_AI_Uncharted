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
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const percentage = Math.min(100, Math.max(0, Math.round(num * 100)));

  const colorStyles = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-sky-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className="w-full text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-mono font-semibold">
          {showPercentage ? `${percentage}%` : num.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
