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
    indigo: 'bg-[#cc8b3c]',
    emerald: 'bg-[#4caf7d]',
    amber: 'bg-[#d4a843]',
    rose: 'bg-[#e05c5c]',
    cyan: 'bg-[#7b9feb]',
    purple: 'bg-[#c4a5f5]',
  };

  return (
    <div className="w-full text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[#888] font-medium">{label}</span>
        <span className="text-[#ececec] font-mono font-semibold">
          {showPercentage ? `${percentage}%` : value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#1e1e1e] rounded-full overflow-hidden border border-[#383838]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
