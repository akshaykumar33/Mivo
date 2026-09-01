import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  customColor?: string | null;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  customColor,
  children,
  style,
  ...props
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-violet-950/60 text-violet-300 border-violet-800/60',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    outline: 'bg-transparent text-slate-300 border-slate-700',
  };

  const customStyles = customColor
    ? {
        backgroundColor: `${customColor}20`,
        borderColor: `${customColor}60`,
        color: customColor,
        ...style,
      }
    : style;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variants[variant],
        className
      )}
      style={customStyles}
      {...props}
    >
      {children}
    </span>
  );
};
