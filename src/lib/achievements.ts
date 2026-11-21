import type { Gone } from './stats'

export type Badge = { id: string; icon: string; have: number; goal: number; done: boolean }
export const LEVELS = [0, 5, 20, 50, 100, 250, 500]

/** Уровень растёт с числом использованных (не выброшенных) продуктов. */
export function level(eaten: number) {
  let lv = 0
  for (let i = 0; i < LEVELS.length; i++) if (eaten >= LEVELS[i]) lv = i
  const cur = LEVELS[lv], next = LEVELS[lv + 1] ?? null
  return { lv: lv + 1, cur, next, pct: next === null ? 100 : Math.round(((eaten - cur) / (next - cur)) * 100) }
}

export function achievements(rows: Gone[], streak: number | null, now = new Date()): { eaten: number; badges: Badge[]; week: { have: number; goal: number } } {
  const eatenRows = rows.filter((r) => r.status === 'consumed')
  const eaten = eatenRows.length
  const weekAgo = now.getTime() - 7 * 864e5
  const weekHave = eatenRows.filter((r) => new Date(r.updated_at).getTime() >= weekAgo).length
  const ym = now.getFullYear() * 12 + now.getMonth()
  const inMonth = (r: Gone) => { const d = new Date(r.updated_at); return d.getFullYear() * 12 + d.getMonth() === ym }
  const mEaten = eatenRows.filter(inMonth).length
  const mThrown = rows.filter((r) => r.status === 'discarded' && inMonth(r)).length
  const st = streak ?? (eaten > 0 ? 180 : 0)
  const mk = (id: string, icon: string, have: number, goal: number): Badge => ({ id, icon, have: Math.min(have, goal), goal, done: have >= goal })
  return {
    eaten,
    week: { have: weekHave, goal: 5 },
    badges: [
      mk('first', '🌱', eaten, 1), mk('ten', '🥗', eaten, 10), mk('fifty', '🍱', eaten, 50), mk('hundred', '🏆', eaten, 100),
      mk('streak7', '🔥', st, 7), mk('streak30', '⚡', st, 30), mk('zeroMonth', '💚', mThrown === 0 ? mEaten : 0, 10),
    ],
  }
}
