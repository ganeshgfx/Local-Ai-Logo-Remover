import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-zinc-100 text-zinc-900 shadow hover:bg-zinc-200',
        secondary:
          'border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800',
        destructive:
          'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
        outline: 'border-zinc-800 text-zinc-400',
        active:
          'border-zinc-700 bg-zinc-800/80 text-zinc-100',
        success:
          'border-zinc-700 bg-zinc-900 text-zinc-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
