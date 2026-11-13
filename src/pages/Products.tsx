import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Barcode, Camera, Check, Pencil, Plus, ScanLine, Search, Trash2, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { compressImage } from '@/lib/image'
import { enqueue, flush, isOffline } from '@/lib/outbox'
import { cn, daysLeft } from '@/lib/utils'
import { ExpiryField } from '@/components/ExpiryField'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupBarcode } from '@/lib/barcode'
import { addToShopping, autoShopEnabled } from '@/lib/shopping'
import { emptyExpiry, expiryFields, fmt, type ExpiryState } from '@/lib/expiry'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge, Card } from '@/components/ui/card'

const PAGE = 30
const COLS = 'id,space_id,name,category,quantity,unit,location,expires_on,produced_on,notes,photo_path,status'

type Filter = 'all' | 'soon' | 'expired'

function ExpiryBadge({ date }: { date: string | null }) {
  const d = daysLeft(date)
  if (d === null) return <Badge className="bg-gray-100 text-gray-600">без срока</Badge>
  if (d < 0) return <Badge className="bg-red-100 text-red-800">просрочено {-d} дн.</Badge>
  if (d === 0) return <Badge className="bg-red-100 text-red-800">сегодня</Badge>
  if (d <= 3) return <Badge className="bg-orange-100 text-orange-800">{d} дн.</Badge>
  if (d <= 7) return <Badge className="bg-yellow-100 text-yellow-800">{d} дн.</Badge>
  return <Badge className="bg-green-100 text-green-800">{d} дн.</Badge>
}

const toExpiryState = (p: Product): ExpiryState => ({ ...emptyExpiry(), mode: 'until', until: p.expires_on ?? '', produced: p.produced_on ?? '' })

export default function Products() {
  const { space, session } = useApp()
  const [items, setItems] = useState<Product[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [exp, setExp] = useState(emptyExpiry())
  const [nm, setNm] = useState('')
  const [bc, setBc] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [bcMsg, setBcMsg] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; action?: { label: string; run: () => void } } | null>(null)
  const [fromShop, setFromShop] = useState<string | null>(null)
  const loc = useLocation()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Product | null>(null)
  const [editExp, setEditExp] = useState(emptyExpiry())

  const load = useCallback(async (from: number) => {
    if (!space) return
    const key = 'products.' + space.id
    if (isOffline()) { if (from === 0) setItems(cacheGet<Product[]>(key) ?? []); return }
    setLoading(true)
    const { data } = await supabase.from('products').select(COLS)
      .eq('space_id', space.id).eq('status', 'active')
      .order('expires_on', { ascending: true, nullsFirst: false })
      .range(from, from + PAGE - 1)
    setLoading(false)
    if (!data) return
    const next = from === 0 ? (data as Product[]) : (items.concat(data as Product[]))
    setItems(next); setMore(data.length === PAGE)
    if (from === 0) cacheSet(key, next)
    const paths = (data as Product[]).map((p) => p.photo_path).filter(Boolean) as string[]
    if (paths.length) {
      const { data: urls } = await supabase.storage.from('foodsave-photos').createSignedUrls(paths, 3600)
      if (urls) setThumbs((t) => ({ ...t, ...Object.fromEntries(urls.filter((u) => u.path && u.signedUrl).map((u) => [u.path!, u.signedUrl as string])) }))
    }
  }, [space, items])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(0) }, [space?.id])
  useEffect(() => {
    const on = async () => { if (await flush()) void load(0) }
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  })

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t) }, [toast])

  // Переход из списка покупок: «Купил → в продукты» открывает форму с названием, остаётся указать срок
  useEffect(() => {
    const pre = (loc.state as { prefill?: { name: string; shoppingId: string } } | null)?.prefill
    if (!pre) return
    setAdding(true); setNm(pre.name); setFromShop(pre.shoppingId)
    nav('.', { replace: true, state: null })
  }, [loc.state, nav])

  async function setStatus(p: Product, status: 'consumed' | 'discarded') {
    setItems((l) => l.filter((x) => x.id !== p.id))
    if (isOffline()) enqueue({ t: 'update', table: 'products', id: p.id, patch: { status } })
    else await supabase.from('products').update({ status }).eq('id', p.id)
    if (!space || !session) return
    const shop = () => addToShopping(space.id, session.user.id, { name: p.name, unit: p.unit })
    if (status === 'consumed' && autoShopEnabled()) {
      const r = await shop()
      setToast({ text: r === 'added' ? `«${p.name}» добавлено в список покупок` : `«${p.name}» уже в списке покупок` })
    } else if (status === 'discarded') {
      setToast({ text: `«${p.name}» выброшено`, action: { label: 'В покупки', run: () => { void shop(); setToast(null) } } })
    }
  }

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!space || !session) return
    const f = new FormData(e.currentTarget)
    const file = f.get('photo') as File
    const id = crypto.randomUUID()
    const row: Record<string, unknown> = {
      id, space_id: space.id, created_by: session.user.id,
      name: String(f.get('name')).trim(),
      quantity: Number(f.get('quantity') || 1), unit: String(f.get('unit') || 'шт'),
      location: String(f.get('location') || '') || null,
      barcode: bc,
      ...expiryFields(exp),
    }
    if (file?.size && !isOffline()) {
      const blob = await compressImage(file)
      const path = `${space.id}/${id}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
      const up = await supabase.storage.from('foodsave-photos').upload(path, blob, { contentType: blob.type })
      if (!up.error) row.photo_path = path
    }
    if (isOffline()) { enqueue({ t: 'insert', table: 'products', row }); setItems((l) => [row as unknown as Product, ...l]) }
    else { await supabase.from('products').insert(row); await load(0) }
    if (fromShop) {
      if (isOffline()) enqueue({ t: 'delete', table: 'shopping_items', id: fromShop })
      else await supabase.from('shopping_items').delete().eq('id', fromShop)
      setFromShop(null)
    }
    setAdding(false); setExp(emptyExpiry()); setNm(''); setBc(null); setBcMsg(null)
  }

  async function onBarcode(code: string) {
    setScanning(false); setBc(code); setBcMsg('Ищу название…')
    const found = space ? await lookupBarcode(code, space.id) : null
    if (found) { setNm(found.name); setBcMsg(found.source === 'history' ? 'Название из ваших прошлых продуктов' : 'Название найдено в базе Open Food Facts, проверьте его') }
    else setBcMsg('Название не найдено: введите его, я запомню его для этого штрихкода')
  }

  function startEdit(p: Product) { setEditing(p); setEditExp(toExpiryState(p)) }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const f = new FormData(e.currentTarget)
    const patch = {
      name: String(f.get('name')).trim() || editing.name,
      quantity: Number(f.get('quantity') || 0), unit: String(f.get('unit') || 'шт'),
      location: String(f.get('location') || '') || null,
      ...expiryFields(editExp),
    }
    setItems((l) => l.map((x) => (x.id === editing.id ? { ...x, ...patch } : x)))
    if (isOffline()) enqueue({ t: 'update', table: 'products', id: editing.id, patch })
    else await supabase.from('products').update(patch).eq('id', editing.id)
    setEditing(null)
  }

  const stats = useMemo(() => {
    let expired = 0, soon = 0
    for (const p of items) { const d = daysLeft(p.expires_on); if (d === null) continue; if (d < 0) expired++; else if (d <= 3) soon++ }
    return { expired, soon }
  }, [items])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((p) => {
      if (needle && !(p.name + ' ' + (p.location ?? '')).toLowerCase().includes(needle)) return false
      const d = daysLeft(p.expires_on)
      if (filter === 'expired') return d !== null && d < 0
      if (filter === 'soon') return d !== null && d >= 0 && d <= 3
      return true
    })
  }, [items, q, filter])

  const chip = (f: Filter, label: string, n?: number, tone = '') => (
    <button key={f} onClick={() => setFilter(f)} className={cn('h-8 rounded-full border px-3 text-xs font-medium', filter === f ? 'border-brand bg-brand text-white' : 'border-green-200 bg-white ' + tone)}>
      {label}{n !== undefined && n > 0 ? ` · ${n}` : ''}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Продукты</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild><Link to="/scan"><ScanLine size={16} />Чек</Link></Button>
          <Button size="sm" onClick={() => setAdding(!adding)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? 'Отмена' : 'Добавить'}</Button>
        </div>
      </div>

      {adding && (
        <Card>
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Название</Label>
              <div className="flex gap-2">
                <Input name="name" required maxLength={120} autoFocus value={nm} onChange={(e) => setNm(e.target.value)} />
                <Button type="button" variant="outline" size="icon" title="Сканировать штрихкод" onClick={() => setScanning(true)}><Barcode size={18} /></Button>
              </div>
              {bc && <p className="mt-1 text-xs text-green-900/70">Штрихкод {bc}{bcMsg ? ` · ${bcMsg}` : ''} <button type="button" className="underline" onClick={() => { setBc(null); setBcMsg(null) }}>убрать</button></p>}
            </div>
            <div><Label>Количество</Label><Input name="quantity" type="number" step="any" min="0" defaultValue={1} /></div>
            <div><Label>Единица</Label><Input name="unit" defaultValue="шт" /></div>
            <div className="col-span-2"><Label>Место</Label><Input name="location" placeholder="холодильник" /></div>
            <div className="col-span-2"><ExpiryField value={exp} onChange={setExp} /></div>
            <div className="col-span-2">
              <Label>Фото (сжимается перед загрузкой)</Label>
              <Input name="photo" type="file" accept="image/*" capture="environment" className="h-auto py-2" />
            </div>
            <Button className="col-span-2"><Camera size={16} />Сохранить</Button>
          </form>
        </Card>
      )}

      {scanning && <BarcodeScanner onDetect={onBarcode} onClose={() => setScanning(false)} />}

      {items.length > 0 && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900/40" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или месту" className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {chip('all', 'Все')}
            {chip('soon', 'Скоро (≤3 дн.)', stats.soon)}
            {chip('expired', 'Просрочено', stats.expired, stats.expired ? 'text-red-700' : '')}
          </div>
        </>
      )}

      {!items.length && !loading && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <img src="/logo-pair.webp" alt="" className="h-36 w-auto" />
          <p className="text-sm text-green-900/60">Пока пусто. Добавьте продукт или отсканируйте чек.</p>
        </div>
      )}
      {items.length > 0 && !shown.length && <p className="py-6 text-center text-sm text-green-900/60">Ничего не найдено.</p>}

      {shown.map((p) => editing?.id === p.id ? (
        <Card key={p.id}>
          <form onSubmit={saveEdit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Название</Label><Input name="name" required maxLength={120} defaultValue={p.name} /></div>
            <div><Label>Количество</Label><Input name="quantity" type="number" step="any" min="0" defaultValue={p.quantity} /></div>
            <div><Label>Единица</Label><Input name="unit" defaultValue={p.unit} /></div>
            <div className="col-span-2"><Label>Место</Label><Input name="location" defaultValue={p.location ?? ''} placeholder="холодильник" /></div>
            <div className="col-span-2"><ExpiryField value={editExp} onChange={setEditExp} /></div>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
            <Button>Сохранить</Button>
          </form>
        </Card>
      ) : (
        <Card key={p.id} className="flex items-start gap-3 p-3">
          {p.photo_path && thumbs[p.photo_path]
            ? <img src={thumbs[p.photo_path]} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            : <div className="h-12 w-12 shrink-0 rounded-lg bg-brand-soft" />}
          <div className="min-w-0 flex-1">
            <div className="break-words font-medium leading-snug">{p.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-green-900/60">
              <span>{p.quantity} {p.unit}</span>{p.location && <span>· {p.location}</span>}{p.produced_on && <span>· произв. {fmt(p.produced_on)}</span>}
            </div>
            <div className="mt-1.5"><ExpiryBadge date={p.expires_on} /></div>
          </div>
          <div className="-mr-1 flex shrink-0">
            <Button variant="ghost" size="icon" title="Изменить" onClick={() => startEdit(p)}><Pencil size={16} className="text-green-900/60" /></Button>
            <Button variant="ghost" size="icon" title="Использовано" onClick={() => setStatus(p, 'consumed')}><Check size={18} className="text-brand" /></Button>
            <Button variant="ghost" size="icon" title="Выброшено" onClick={() => setStatus(p, 'discarded')}><Trash2 size={18} className="text-red-600" /></Button>
          </div>
        </Card>
      ))}
      {more && <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(items.length)}>Показать ещё</Button>}

      {toast && (
        <div className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-green-950 px-4 py-3 text-sm text-white shadow-lg">
          <span>{toast.text}</span>
          {toast.action && <button className="shrink-0 font-semibold text-green-300 underline" onClick={toast.action.run}>{toast.action.label}</button>}
        </div>
      )}
    </div>
  )
}
