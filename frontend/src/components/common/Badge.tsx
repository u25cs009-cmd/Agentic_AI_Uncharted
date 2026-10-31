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
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200' + (glow ? ' ring-2 ring-indigo-100' : ''),
    cyan: 'bg-sky-50 text-sky-700 border-sky-200' + (glow ? ' ring-2 ring-sky-100' : ''),
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200' + (glow ? ' ring-2 ring-emerald-100' : ''),
    warning: 'bg-amber-50 text-amber-700 border-amber-200' + (glow ? ' ring-2 ring-amber-100' : ''),
    danger: 'bg-rose-50 text-rose-700 border-rose-200' + (glow ? ' ring-2 ring-rose-100' : ''),
    purple: 'bg-purple-50 text-purple-700 border-purple-200' + (glow ? ' ring-2 ring-purple-100' : ''),
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider font-semibold',
    md: 'text-xs px-2.5 py-0.5 tracking-wide font-medium',
    lg: 'text-xs px-3 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full font-mono transition-all duration-150 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
