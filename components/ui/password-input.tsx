import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showPasswordLabel = 'Show password',
      hidePasswordLabel = 'Hide password',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('w-full pr-12', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
          aria-pressed={showPassword}
          tabIndex={0}
          className="hit-slop absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
