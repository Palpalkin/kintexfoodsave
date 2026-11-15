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

/** Шаг «использовал часть»: штуки по 1, вес/объём — крупными долями. */
export function partStep(unit: string, qty: number): number {
  const u = unit.trim().toLowerCase().replace('.', '')
  if (u === 'г' || u === 'мл') return qty >= 500 ? 100 : qty >= 100 ? 50 : 10
  if (u === 'кг' || u === 'л') return qty > 1 ? 0.5 : 0.25
  return 1
}
