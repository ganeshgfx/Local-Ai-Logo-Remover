import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 shadow-sm',
        destructive: 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white',
        outline: 'border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white',
        secondary: 'bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800',
        ghost: 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100',
        link: 'text-zinc-100 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-sm font-medium',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
