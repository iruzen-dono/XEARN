'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="input-group">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">{icon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-field',
              icon && 'pl-10',
              error && 'border-danger-500/60 focus:border-danger-500 focus:ring-danger-500/20',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="input-error">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
