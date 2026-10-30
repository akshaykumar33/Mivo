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
    default: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    primary: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
    outline: 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)]',
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
