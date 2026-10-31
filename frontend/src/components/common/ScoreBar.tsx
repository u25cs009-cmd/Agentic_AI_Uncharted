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
  color = 'cyan',
  showPercentage = false,
}) => {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const percentage = Math.min(100, Math.max(0, Math.round(num * 100)));

  const colorStyles = {
    indigo: 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    rose: 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    cyan: 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    purple: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
  };

  return (
    <div className="w-full text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-white font-mono font-semibold">
          {showPercentage ? `${percentage}%` : num.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
