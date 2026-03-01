'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger:
    'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-danger-600 to-danger-500 hover:from-danger-500 hover:to-danger-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-danger-500/25 hover:shadow-danger-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClasses: Record<Size, string> = {
  sm: 'py-2 px-4 text-sm rounded-lg',
  md: 'py-3 px-6 text-sm',
  lg: 'py-4 px-8 text-base rounded-2xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        whileTap={{ scale: 0.97 }}
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
