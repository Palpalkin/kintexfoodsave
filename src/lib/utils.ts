import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

export function daysLeft(expires: string | null): number | null {
  if (!expires) return null
  const [y, m, d] = expires.split('-').map(Number)
  const end = new Date(y, m - 1, d).getTime()
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((end - now.getTime()) / 86400000)
}
