import { locale } from './i18n'
// Сводка по ушедшим продуктам: по месяцам, самые частые выбросы, серия дней без выброса.
export type Gone = { name: string; status: 'consumed' | 'discarded'; price: number | null; updated_at: string }
export type Month = { key: string; label: string; eaten: number; thrown: number; lost: number }

const mkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function summarize(rows: Gone[], now = new Date(), months = 6) {
  const list: Month[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({ key: mkey(d), label: d.toLocaleDateString(locale(), { month: 'short' }).replace('.', ''), eaten: 0, thrown: 0, lost: 0 })
  }
  const byKey = new Map(list.map((m) => [m.key, m]))
  const wasted = new Map<string, number>()
  let lastThrow: Date | null = null
  for (const r of rows) {
    const d = new Date(r.updated_at); const m = byKey.get(mkey(d))
    if (r.status === 'discarded') {
      if (m) { m.thrown++; m.lost += Number(r.price ?? 0) }
      const k = r.name.trim().toLowerCase(); wasted.set(k, (wasted.get(k) ?? 0) + 1)
      if (!lastThrow || d > lastThrow) lastThrow = d
    } else if (m) m.eaten++
  }
  const top = [...wasted.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n }))
  const streak = lastThrow ? Math.max(0, Math.floor((now.getTime() - lastThrow.getTime()) / 86400000)) : null
  return { months: list, top, streak }
}
