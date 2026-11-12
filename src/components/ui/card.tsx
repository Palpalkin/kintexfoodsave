import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-green-100 bg-white p-4 shadow-sm', className)} {...p} />
)

export const Badge = ({ className, ...p }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)} {...p} />
)
