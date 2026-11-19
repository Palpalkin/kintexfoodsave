import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus, Plus, Star, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { flush, isOffline, run } from '@/lib/outbox'
import { useT } from '@/lib/i18n'
import { cn, defaultUnit, isPcs } from '@/lib/utils'
import { addToShopping } from '@/lib/shopping'
import { loadFavs, type Fav } from '@/lib/favorites'
import type { ShoppingItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Shopping() {
  const { space, session } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [name, setName] = useState('')
  const [favs, setFavs] = useState<Fav[]>([])
  useEffect(() => { if (space) void loadFavs(space.id).then(setFavs) }, [space])

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
    const row = { id: crypto.randomUUID(), space_id: space.id, created_by: session.user.id, name: name.trim(), quantity: 1, unit: defaultUnit() }
    save([{ ...row, checked: false }, ...items]); setName('')
    await run({ t: 'insert', table: 'shopping_items', row })
  }

  async function toggle(it: ShoppingItem) {
    save(items.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)).sort((a, b) => Number(a.checked) - Number(b.checked)))
    await run({ t: 'update', table: 'shopping_items', id: it.id, patch: { checked: !it.checked } })
  }

  async function remove(id: string) {
    save(items.filter((x) => x.id !== id))
    await run({ t: 'delete', table: 'shopping_items', id })
  }

  async function clearBought() {
    const ids = items.filter((x) => x.checked).map((x) => x.id)
    save(items.filter((x) => !x.checked))
    for (const id of ids) await run({ t: 'delete', table: 'shopping_items', id })
  }

  const todo = items.filter((x) => !x.checked), bought = items.filter((x) => x.checked)

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t('shopping.title')}</h2>
      <form onSubmit={add} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('shopping.placeholder')} maxLength={120} />
        <Button size="icon" title={t('common.add')}><Plus size={18} /></Button>
      </form>

      {favs.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-xs font-medium text-green-900/60"><Star size={12} className="fill-yellow-400 text-yellow-500" />{t('shopping.favHint')}</p>
          <div className="flex flex-wrap gap-1.5">
            {favs.map((f) => {
              const inList = items.some((i) => !i.checked && i.name.toLowerCase() === f.name.toLowerCase())
              return <button key={f.name_key} disabled={inList} onClick={async () => { if (space && session) { await addToShopping(space.id, session.user.id, { name: f.name, unit: f.unit }); await load() } }}
                className={cn('rounded-full border px-3 py-1 text-xs', inList ? 'border-green-100 text-green-900/40' : 'border-green-200 bg-white')}>{inList ? '✓ ' : '+ '}{f.name}</button>
            })}
          </div>
        </div>
      )}

      {!items.length && <p className="py-10 text-center text-sm text-green-900/60">{t('shopping.empty')}</p>}

      {todo.map((it) => (
        <Card key={it.id} className="flex items-center gap-3 p-3">
          <input type="checkbox" className="h-5 w-5 accent-green-700" checked={false} onChange={() => toggle(it)} aria-label={t('shopping.bought')} />
          <div className="min-w-0 flex-1 truncate">{it.name}{it.quantity !== 1 || !isPcs(it.unit) ? <span className="text-xs text-green-900/60"> · {it.quantity} {it.unit}</span> : null}</div>
          <Button variant="ghost" size="icon" title={t('shopping.toProducts')} onClick={() => nav('/', { state: { prefill: { name: it.name, shoppingId: it.id } } })}><PackagePlus size={18} className="text-brand" /></Button>
          <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => remove(it.id)}><Trash2 size={16} className="text-red-600" /></Button>
        </Card>
      ))}

      {bought.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold text-green-900/70">{t('shopping.boughtTitle')}</h3>
            <Button size="sm" variant="ghost" onClick={clearBought}>{t('shopping.clear')}</Button>
          </div>
          {bought.map((it) => (
            <Card key={it.id} className="flex items-center gap-3 p-3 opacity-60">
              <input type="checkbox" className="h-5 w-5 accent-green-700" checked onChange={() => toggle(it)} aria-label={t('shopping.restore')} />
              <div className={cn('min-w-0 flex-1 truncate line-through')}>{it.name}</div>
              <Button variant="ghost" size="icon" title={t('shopping.toProducts')} onClick={() => nav('/', { state: { prefill: { name: it.name, shoppingId: it.id } } })}><PackagePlus size={18} className="text-brand" /></Button>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
