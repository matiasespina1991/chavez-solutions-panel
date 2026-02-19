import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string;
  initials?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ imageUrl, initials, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex size-12 items-center justify-center rounded-2xl border border-border bg-muted text-base font-semibold text-muted-foreground',
        className
      )}
      {...props}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={initials || 'avatar'}
          className="size-full rounded-2xl object-cover"
        />
      ) : (
        <span>{initials?.slice(0, 2).toUpperCase() || 'LB'}</span>
      )}
    </div>
  )
);
Avatar.displayName = 'Avatar';
