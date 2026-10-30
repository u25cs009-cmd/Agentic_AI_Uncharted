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
    primary: 'bg-[rgba(204,139,60,0.18)] text-[#f0aa55] border-[rgba(204,139,60,0.4)]' + (glow ? ' shadow-[0_0_12px_rgba(204,139,60,0.25)]' : ''),
    success: 'bg-[rgba(76,175,125,0.15)] text-[#60d49a] border-[rgba(76,175,125,0.35)]' + (glow ? ' shadow-[0_0_12px_rgba(76,175,125,0.25)]' : ''),
    warning: 'bg-[rgba(220,170,60,0.15)] text-[#e8c060] border-[rgba(220,170,60,0.35)]' + (glow ? ' shadow-[0_0_12px_rgba(220,170,60,0.25)]' : ''),
    danger: 'bg-[rgba(220,80,80,0.15)] text-[#f07070] border-[rgba(220,80,80,0.35)]' + (glow ? ' shadow-[0_0_12px_rgba(220,80,80,0.25)]' : ''),
    purple: 'bg-[rgba(168,130,220,0.15)] text-[#c4a5f5] border-[rgba(168,130,220,0.35)]' + (glow ? ' shadow-[0_0_12px_rgba(168,130,220,0.25)]' : ''),
    cyan: 'bg-[rgba(120,160,240,0.15)] text-[#90b4f0] border-[rgba(120,160,240,0.35)]' + (glow ? ' shadow-[0_0_12px_rgba(120,160,240,0.25)]' : ''),
    neutral: 'bg-[#2a2a2a] text-[#b4b4b4] border-[#404040]',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-0.5 tracking-wide',
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
