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

export function enqueue(op: Op) { write([...read(), op]) }

export async function flush(): Promise<number> {
  if (!navigator.onLine) return 0
  const q = read(); const rest: Op[] = []; let done = 0
  for (const op of q) {
    const res = op.t === 'insert'
      ? await supabase.from(op.table).insert(op.row)
      : op.t === 'update'
        ? await supabase.from(op.table).update(op.patch).eq('id', op.id)
        : await supabase.from(op.table).delete().eq('id', op.id)
    if (res.error && res.error.code !== '23505') rest.push(op); else done++
  }
  write(rest)
  return done
}

export const isOffline = () => !navigator.onLine
