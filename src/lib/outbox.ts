// Офлайн-очередь записей: при отсутствии сети операции кладутся в localStorage
// и отправляются при восстановлении соединения.
import { supabase } from './supabase'

type Table = 'products' | 'shopping_items'
type Op =
  | { t: 'insert'; table: Table; row: Record<string, unknown> }
  | { t: 'update'; table: Table; id: string; patch: Record<string, unknown> }
  | { t: 'delete'; table: Table; id: string }

const KEY = 'fs.outbox.v1'
const read = (): Op[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const write = (q: Op[]) => localStorage.setItem(KEY, JSON.stringify(q))

export const pendingCount = () => read().length

const changed = () => window.dispatchEvent(new Event('fs-outbox'))
export function enqueue(op: Op) { write([...read(), op]); changed() }
export const onOutboxChange = (cb: () => void) => { window.addEventListener('fs-outbox', cb); return () => window.removeEventListener('fs-outbox', cb) }

const exec = (op: Op) =>
  op.t === 'insert' ? supabase.from(op.table).insert(op.row)
  : op.t === 'update' ? supabase.from(op.table).update(op.patch).eq('id', op.id)
  : supabase.from(op.table).delete().eq('id', op.id)

export type RunResult = { ok: true; queued: boolean } | { ok: false; message: string }

/** Выполняет запись: онлайн — сразу; сети нет или запрос оборвался — в очередь (не теряется). Отказ сервера (права, данные) возвращается как ошибка. */
export async function run(op: Op): Promise<RunResult> {
  if (!navigator.onLine) { enqueue(op); return { ok: true, queued: true } }
  let res
  try { res = await exec(op) } catch { enqueue(op); return { ok: true, queued: true } }
  if (!res.error) return { ok: true, queued: false }
  if (res.error.code) return { ok: false, message: res.error.message }
  enqueue(op); return { ok: true, queued: true }
}

export async function flush(): Promise<number> {
  if (!navigator.onLine) return 0
  const q = read(); const rest: Op[] = []; let done = 0
  for (const op of q) {
    let err: { code?: string } | null = null
    try { err = (await exec(op)).error } catch { err = {} }
    if (err && err.code && err.code !== '23505') continue // отказ сервера: операция невыполнима, не зацикливаем очередь
    if (err && !err.code) rest.push(op); else done++
  }
  write(rest); changed()
  return done
}

export const isOffline = () => !navigator.onLine
