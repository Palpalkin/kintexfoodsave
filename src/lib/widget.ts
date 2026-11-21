import { supabase } from './supabase'
import { getLang } from './i18n'

export type WidgetSummary = { active: number; expired: number; soon3: number; soon7: number; shopping: number; eaten30: number; thrown30: number; items: { name: string; on: string }[]; today: string }

export const hasWidgetToken = async (): Promise<boolean> => !!(await supabase.rpc('has_widget_token')).data
export async function createWidgetToken(): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_widget_token'); return error ? null : (data as string)
}
export const revokeWidgetToken = async () => { await supabase.rpc('revoke_widget_token') }

/** Бейдж на иконке установленного PWA: сколько продуктов испортится в ближайшие 3 дня или уже испортилось. */
export async function updateBadge(spaceId: string) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (!nav.setAppBadge) return
  const lim = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).eq('status', 'active').lte('expires_on', lim)
  try { if (count) await nav.setAppBadge(count); else await nav.clearAppBadge?.() } catch { /* нет разрешения */ }
}

const LABELS = {
  ru: { title: 'FoodSave', soon: 'Скоро испортится', expired: 'Просрочено', total: 'Всего', shop: 'Купить', ok: 'Всё в порядке', today: 'сегодня', d: 'дн.', over: 'просрочен', eaten: 'Съедено', thrown: 'Выброшено', err: 'Нет данных. Проверьте токен и интернет.' },
  en: { title: 'FoodSave', soon: 'Expiring soon', expired: 'Expired', total: 'Total', shop: 'To buy', ok: 'All good', today: 'today', d: 'd', over: 'expired', eaten: 'Eaten', thrown: 'Thrown', err: 'No data. Check the token and your connection.' },
}

/** Готовый скрипт для бесплатного приложения Scriptable. Токен даёт доступ только к сводке (счётчики и 5 ближайших сроков). */
export function scriptableSource(url: string, key: string, token: string): string {
  const L = LABELS[getLang()]
  return `// FoodSave widget for Scriptable. Read-only token: it only returns counters and 5 nearest expiry dates.
const CFG = ${JSON.stringify({ url, key, token })}
const L = ${JSON.stringify(L)}
const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), 'foodsave.json')
async function load() {
  try {
    const r = new Request(CFG.url + '/rest/v1/rpc/widget_summary')
    r.method = 'POST'; r.headers = { apikey: CFG.key, 'Content-Type': 'application/json' }
    r.body = JSON.stringify({ p_token: CFG.token })
    const d = await r.loadJSON()
    if (d && typeof d.active === 'number') { fm.writeString(cache, JSON.stringify(d)); return d }
  } catch (e) {}
  return fm.fileExists(cache) ? JSON.parse(fm.readString(cache)) : null
}
const left = (on) => { const a = new Date(); a.setHours(0, 0, 0, 0); const [y, m, d] = on.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - a) / 864e5) }
const when = (n) => n < 0 ? L.over : n === 0 ? L.today : n + ' ' + L.d
const tone = (n) => n < 0 ? new Color('#ff6b6b') : n <= 3 ? new Color('#ffb347') : Color.white()
const d = await load()
const w = new ListWidget()
w.backgroundGradient = (() => { const g = new LinearGradient(); g.colors = [new Color('#14532d'), new Color('#16a34a')]; g.locations = [0, 1]; return g })()
w.url = 'https://kintexfoodsave.pages.dev'
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)
const fam = config.widgetFamily || 'medium'
const txt = (stack, s, size, color, bold) => { const t = stack.addText(String(s)); t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size); t.textColor = color || Color.white(); return t }
if (!d) { txt(w, L.err, 12) }
else if (fam === 'accessoryCircular') { txt(w, d.soon3 + d.expired, 26, Color.white(), true); txt(w, '⏳', 12) }
else if (fam === 'accessoryRectangular' || fam === 'accessoryInline') {
  txt(w, L.title + ': ' + L.total + ' ' + d.active, 13, Color.white(), true)
  txt(w, L.soon + ': ' + d.soon3 + (d.expired ? ' · ' + L.expired + ': ' + d.expired : ''), 12)
} else {
  const row = w.addStack(); row.layoutHorizontally()
  const a = row.addStack(); a.layoutVertically()
  txt(a, L.title, 12, new Color('#bbf7d0'), true)
  txt(a, d.soon3 + d.expired, fam === 'small' ? 44 : 40, Color.white(), true)
  txt(a, d.soon3 + d.expired ? L.soon : L.ok, 11, new Color('#dcfce7'))
  a.addSpacer(6)
  txt(a, L.total + ': ' + d.active, 12)
  if (d.expired) txt(a, L.expired + ': ' + d.expired, 12, new Color('#ff6b6b'), true)
  if (d.shopping) txt(a, L.shop + ': ' + d.shopping, 12)
  if (fam !== 'small') {
    row.addSpacer(14)
    const b = row.addStack(); b.layoutVertically()
    for (const it of d.items.slice(0, fam === 'large' ? 5 : 4)) { const n = left(it.on); const s = b.addStack(); txt(s, it.name.slice(0, 18), 13); s.addSpacer(); txt(s, when(n), 13, tone(n), true); b.addSpacer(3) }
    if (fam === 'large') { b.addSpacer(8); txt(b, L.eaten + ': ' + d.eaten30 + ' · ' + L.thrown + ': ' + d.thrown30, 12, new Color('#dcfce7')) }
  }
}
if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium()
Script.complete()
`
}
