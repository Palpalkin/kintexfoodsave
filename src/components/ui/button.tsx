import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-brand',
  {
    variants: {
      variant: {
        default: 'bg-brand text-white hover:bg-green-800',
        outline: 'border border-green-200 bg-white hover:bg-brand-soft',
        ghost: 'hover:bg-brand-soft',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: { default: 'h-10 px-4', sm: 'h-8 px-3', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {
  asChild?: boolean
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...p }, ref) => {
    const C = asChild ? Slot : 'button'
    return <C ref={ref} className={cn(variants({ variant, size }), className)} {...p} />
  },
)
Button.displayName = 'Button'
