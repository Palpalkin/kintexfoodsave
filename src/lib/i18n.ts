// Лёгкая локализация без внешних библиотек. Словари лежат в src/locales/*.ts (по одному файлу на раздел) и подключаются автоматически.
import { useSyncExternalStore } from 'react'

export type Lang = 'ru' | 'en'
export const LANGS: Lang[] = ['ru', 'en']
type Dict = Record<string, string>
export type Locale = { ru: Dict; en: Dict }

const mods = import.meta.glob<{ default: Locale }>('../locales/*.ts', { eager: true })
export const dicts: Record<Lang, Dict> = { ru: {}, en: {} }
for (const m of Object.values(mods)) { Object.assign(dicts.ru, m.default.ru); Object.assign(dicts.en, m.default.en) }

const KEY = 'fs.lang'
const detect = (): Lang => {
  try { const s = localStorage.getItem(KEY); if (s === 'ru' || s === 'en') return s } catch { /* */ }
  return (typeof navigator !== 'undefined' && /^ru\b/i.test(navigator.language)) ? 'ru' : 'en'
}

let current: Lang = detect()
const subs = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = current

export const getLang = () => current
export function setLang(l: Lang) {
  if (l === current) return
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l
  subs.forEach((f) => f())
}

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s)

/** t('products.title') или t('stats.left', { n: 3 }). Нет перевода → русский → сам ключ. */
export function t(key: string, vars?: Record<string, string | number>): string {
  return fill(dicts[current][key] ?? dicts.ru[key] ?? key, vars)
}

/** Множественное число: значение в словаре «one|few|many» (ru) или «one|other» (en). */
export function tp(key: string, n: number, vars?: Record<string, string | number>): string {
  const raw = dicts[current][key] ?? dicts.ru[key] ?? key
  const f = raw.split('|')
  let i = 0
  if (current === 'ru') { const a = Math.abs(n) % 100, b = a % 10; i = a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2 }
  else i = Math.abs(n) === 1 ? 0 : 1
  return fill(f[Math.min(i, f.length - 1)], { n, ...vars })
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
/** Хук: компонент перерисуется при смене языка. */
export function useLang(): Lang { return useSyncExternalStore(subscribe, getLang, getLang) }
export function useT() { useLang(); return t }
export const locale = () => (current === 'ru' ? 'ru-RU' : 'en-GB')
