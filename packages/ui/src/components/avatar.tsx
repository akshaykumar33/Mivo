import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  isSpeaking?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallbackText,
  size = 'md',
  status,
  isSpeaking = false,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const statusSizes = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-3 h-3 ring-2',
    lg: 'w-4 h-4 ring-2',
    xl: 'w-5 h-5 ring-3',
  };

  const statusColors = {
    ONLINE: 'bg-emerald-500',
    IDLE: 'bg-amber-500',
    DND: 'bg-rose-500',
    OFFLINE: 'bg-slate-500',
  };

  const initials = fallbackText
    ? fallbackText
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center rounded-full select-none transition-all duration-200',
        isSpeaking && 'ring-3 ring-emerald-500 ring-offset-2 ring-offset-[#0B0E14] shadow-lg shadow-emerald-500/40 animate-speaking',
        sizes[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center font-semibold text-white shadow-inner">
          {initials}
        </div>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-slate-900',
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
};
