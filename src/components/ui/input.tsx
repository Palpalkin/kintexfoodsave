import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn('h-10 w-full rounded-lg border border-green-200 bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-green-200', className)}
      {...p}
    />
  ),
)
Input.displayName = 'Input'

export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1 block text-xs font-medium text-green-900/70', className)} {...p} />
)
