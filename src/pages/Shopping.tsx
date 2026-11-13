import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { enqueue, flush, isOffline } from '@/lib/outbox'
import { cn } from '@/lib/utils'
import type { ShoppingItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Shopping() {
  const { space, session } = useApp()
  const nav = useNavigate()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    if (!space) return
    const key = 'shopping.' + space.id
    if (isOffline()) { setItems(cacheGet<ShoppingItem[]>(key) ?? []); return }
    await flush()
    const { data } = await supabase.from('shopping_items').select('id,space_id,name,quantity,unit,checked')
      .eq('space_id', space.id).order('checked').order('created_at', { ascending: false }).limit(200)
    if (data) { setItems(data as ShoppingItem[]); cacheSet(key, data) }
  }, [space])
  useEffect(() => { void load() }, [load])

  const save = (next: ShoppingItem[]) => { setItems(next); if (space) cacheSet('shopping.' + space.id, next) }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!space || !session || !name.trim()) return
    const row = { id: crypto.randomUUID(), space_id: space.id, created_by: session.user.id, name: name.trim(), quantity: 1, unit: 'шт' }
    save([{ ...row, checked: false }, ...items]); setName('')
    if (isOffline()) enqueue({ t: 'insert', table: 'shopping_items', row })
    else await supabase.from('shopping_items').insert(row)
  }

  async function toggle(it: ShoppingItem) {
    save(items.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)).sort((a, b) => Number(a.checked) - Number(b.checked)))
    if (isOffline()) enqueue({ t: 'update', table: 'shopping_items', id: it.id, patch: { checked: !it.checked } })
    else await supabase.from('shopping_items').update({ checked: !it.checked }).eq('id', it.id)
  }

  async function remove(id: string) {
    save(items.filter((x) => x.id !== id))
    if (isOffline()) enqueue({ t: 'delete', table: 'shopping_items', id })
    else await supabase.from('shopping_items').delete().eq('id', id)
  }

  async function clearBought() {
    const ids = items.filter((x) => x.checked).map((x) => x.id)
    save(items.filter((x) => !x.checked))
    if (isOffline()) ids.forEach((id) => enqueue({ t: 'delete', table: 'shopping_items', id }))
    else await supabase.from('shopping_items').delete().in('id', ids)
  }

  const todo = items.filter((x) => !x.checked), bought = items.filter((x) => x.checked)

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Список покупок</h2>
      <form onSubmit={add} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Что купить?" maxLength={120} />
        <Button size="icon" title="Добавить"><Plus size={18} /></Button>
      </form>

      {!items.length && <p className="py-10 text-center text-sm text-green-900/60">Список пуст. Когда вы отметите продукт «использовано», он сам попадёт сюда, чтобы не забыть купить снова.</p>}

      {todo.map((it) => (
        <Card key={it.id} className="flex items-center gap-3 p-3">
          <input type="checkbox" className="h-5 w-5 accent-green-700" checked={false} onChange={() => toggle(it)} aria-label="Куплено" />
          <div className="min-w-0 flex-1 truncate">{it.name}{it.quantity !== 1 || it.unit !== 'шт' ? <span className="text-xs text-green-900/60"> · {it.quantity} {it.unit}</span> : null}</div>
          <Button variant="ghost" size="icon" title="В продукты (указать срок)" onClick={() => nav('/', { state: { prefill: { name: it.name, shoppingId: it.id } } })}><PackagePlus size={18} className="text-brand" /></Button>
          <Button variant="ghost" size="icon" title="Удалить" onClick={() => remove(it.id)}><Trash2 size={16} className="text-red-600" /></Button>
        </Card>
      ))}

      {bought.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold text-green-900/70">Куплено</h3>
            <Button size="sm" variant="ghost" onClick={clearBought}>Очистить</Button>
          </div>
          {bought.map((it) => (
            <Card key={it.id} className="flex items-center gap-3 p-3 opacity-60">
              <input type="checkbox" className="h-5 w-5 accent-green-700" checked onChange={() => toggle(it)} aria-label="Вернуть в список" />
              <div className={cn('min-w-0 flex-1 truncate line-through')}>{it.name}</div>
              <Button variant="ghost" size="icon" title="В продукты (указать срок)" onClick={() => nav('/', { state: { prefill: { name: it.name, shoppingId: it.id } } })}><PackagePlus size={18} className="text-brand" /></Button>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
