import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  glow = false,
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35' + (glow ? ' shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''),
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35' + (glow ? ' shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''),
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' + (glow ? ' shadow-[0_0_12px_rgba(16,185,129,0.3)]' : ''),
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/35' + (glow ? ' shadow-[0_0_12px_rgba(245,158,11,0.25)]' : ''),
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/35' + (glow ? ' shadow-[0_0_12px_rgba(244,63,94,0.3)]' : ''),
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/35' + (glow ? ' shadow-[0_0_12px_rgba(168,85,247,0.3)]' : ''),
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider font-semibold',
    md: 'text-xs px-2.5 py-0.5 tracking-wide font-medium',
    lg: 'text-xs px-3 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full font-mono transition-all duration-200 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
