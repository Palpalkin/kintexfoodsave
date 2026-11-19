import { locale, t } from './i18n'
// Срок годности: «годен до <дата>» либо «дата производства + годен N дней/недель/месяцев/лет».
export type Unit = 'days' | 'weeks' | 'months' | 'years'
export type ExpiryState = { mode: 'until' | 'life'; produced: string; until: string; amount: string; unit: Unit }

export const emptyExpiry = (): ExpiryState => ({ mode: 'life', produced: '', until: '', amount: '', unit: 'days' })

export const UNITS: Unit[] = ['days', 'weeks', 'months', 'years']
export const unitLabel = (u: Unit) => t('expiry.unit.' + u)

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayIso = () => iso(new Date())

/** Прибавляет срок к дате. Месяцы/годы: 31 янв + 1 мес = 28/29 фев (без перескока на март). */
export function addPeriod(from: string, amount: number, unit: Unit): string {
  const d = parse(from)
  if (unit === 'days') d.setDate(d.getDate() + amount)
  else if (unit === 'weeks') d.setDate(d.getDate() + amount * 7)
  else {
    const months = unit === 'months' ? amount : amount * 12
    const day = d.getDate()
    d.setDate(1); d.setMonth(d.getMonth() + months)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, last))
  }
  return iso(d)
}

export function computeExpiry(s: ExpiryState): string | null {
  if (s.mode === 'until') return s.until || null
  const n = parseInt(s.amount, 10)
  if (!s.produced || !Number.isFinite(n) || n <= 0) return null
  return addPeriod(s.produced, n, s.unit)
}

export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)

/** Поля для записи в БД. */
export function expiryFields(s: ExpiryState) {
  const expires_on = computeExpiry(s)
  const produced_on = s.produced || null
  const shelf_life_days = produced_on && expires_on && daysBetween(produced_on, expires_on) > 0 ? daysBetween(produced_on, expires_on) : null
  return { expires_on, produced_on, shelf_life_days }
}

export const fmt = (s: string) => s.split('-').reverse().join(locale() === 'ru-RU' ? '.' : '/')
