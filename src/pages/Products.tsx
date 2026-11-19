import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Barcode, Camera, Check, Pencil, Plus, ScanLine, Search, Trash2, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { compressImage } from '@/lib/image'
import { flush, isOffline, run } from '@/lib/outbox'
import { cn, daysLeft, defaultUnit, partStep } from '@/lib/utils'
import { t as tr, tp, useT } from '@/lib/i18n'
import { ExpiryField } from '@/components/ExpiryField'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupBarcode } from '@/lib/barcode'
import { addToShopping, autoShopEnabled } from '@/lib/shopping'
import { addPeriod, computeExpiry, emptyExpiry, expiryFields, fmt, todayIso, type ExpiryState } from '@/lib/expiry'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge, Card } from '@/components/ui/card'
import { SwipeRow } from '@/components/SwipeRow'
import { findPhoto } from '@/lib/photo'
import { favKey, loadFavs, toggleFav } from '@/lib/favorites'
import { Star } from 'lucide-react'
import { typicalDays } from '@/lib/shelf'
import { foodEmoji } from '@/lib/emoji'

const PAGE = 30
const photoTried = new Set<string>()
const COLS = 'id,space_id,name,category,quantity,unit,location,expires_on,produced_on,notes,photo_path,photo_url,brand,barcode,status'

function edgeTone(date: string | null) {
  const d = daysLeft(date)
  if (d === null) return 'border-l-gray-200'
  if (d <= 0) return 'border-l-red-500'
  if (d <= 3) return 'border-l-orange-400'
  if (d <= 7) return 'border-l-yellow-400'
  return 'border-l-green-500'
}

type Filter = 'all' | 'soon' | 'expired' | 'fav'

function ExpiryBadge({ date }: { date: string | null }) {
  const t = useT()
  const d = daysLeft(date)
  if (d === null) return <Badge className="bg-gray-100 text-gray-600">{t('products.noExpiry')}</Badge>
  if (d < 0) return <Badge className="fs-pulse bg-red-100 text-red-800">{t('products.overdue', { n: -d })}</Badge>
  if (d === 0) return <Badge className="fs-pulse bg-red-100 text-red-800">{t('products.today')}</Badge>
  if (d <= 3) return <Badge className="bg-orange-100 text-orange-800">{t('products.daysN', { n: d })}</Badge>
  if (d <= 7) return <Badge className="bg-yellow-100 text-yellow-800">{t('products.daysN', { n: d })}</Badge>
  return <Badge className="bg-green-100 text-green-800">{t('products.daysN', { n: d })}</Badge>
}

const toExpiryState = (p: Product): ExpiryState => ({ ...emptyExpiry(), mode: 'until', until: p.expires_on ?? '', produced: p.produced_on ?? '' })

export default function Products() {
  const t = useT()
  const { space, session } = useApp()
  const [items, setItems] = useState<Product[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [favNames, setFavNames] = useState<string[]>([])
  const [badImg, setBadImg] = useState<Set<string>>(new Set())
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [exp, setExp] = useState(emptyExpiry())
  const [nm, setNm] = useState('')
  const [unitV, setUnitV] = useState(defaultUnit())
  const [locV, setLocV] = useState('')
  const [hist, setHist] = useState<Record<string, { name: string; unit: string; location: string | null; days: number | null }>>({})
  const [autofilled, setAutofilled] = useState(false)
  const [histFor, setHistFor] = useState<string | null>(null)
  const [bc, setBc] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [bcMsg, setBcMsg] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; action?: { label: string; run: () => void } } | null>(null)
  const [fromShop, setFromShop] = useState<string | null>(null)
  const loc = useLocation()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [locF, setLocF] = useState<string | null>(null)
  const [openDays, setOpenDays] = useState('3')
  const [openedOn, setOpenedOn] = useState<string | null>(null)
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
  useEffect(() => { if (space) void loadFavs(space.id).then((l) => { setFavs(new Set(l.map((f) => f.name_key))); setFavNames(l.map((f) => f.name)) }) }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Фото из открытой базы для продуктов без своего фото: по несколько штук за раз, результат запоминается в записи.
  useEffect(() => {
    const todo = items.filter((p) => !p.photo_path && !p.photo_url && !photoTried.has(p.id)).slice(0, 4)
    if (!todo.length || isOffline()) return
    let off = false
    void (async () => {
      for (const p of todo) {
        photoTried.add(p.id)
        const hit = await findPhoto(p.name, p.barcode)
        if (off || !hit) continue
        setItems((l) => l.map((x) => (x.id === p.id ? { ...x, photo_url: hit.url, brand: x.brand ?? hit.brand } : x)))
        await supabase.from('products').update({ photo_url: hit.url, brand: p.brand ?? hit.brand }).eq('id', p.id)
      }
    })()
    return () => { off = true }
  }, [items])

  // «Использовал часть»: уменьшает количество на шаг; когда ничего не осталось — продукт считается использованным.
  async function usePart(p: Product) {
    const left = Math.round((p.quantity - partStep(p.unit, p.quantity)) * 1000) / 1000
    if (left <= 0) { void setStatus(p, 'consumed'); return }
    const before = items
    setItems((l) => l.map((x) => (x.id === p.id ? { ...x, quantity: left } : x)))
    const r = await run({ t: 'update', table: 'products', id: p.id, patch: { quantity: left } })
    if (!r.ok) { setItems(before); setToast({ text: t('products.saveFail', { msg: r.message }) }); return }
    setToast({ text: t('products.left', { name: p.name, left, unit: p.unit }), action: { label: t('products.undo'), run: () => { setItems((l) => l.map((x) => (x.id === p.id ? { ...x, quantity: p.quantity } : x))); void run({ t: 'update', table: 'products', id: p.id, patch: { quantity: p.quantity } }); setToast(null) } } })
  }

  async function star(p: Product) {
    if (!space || !session) return
    const k = favKey(p.name); const on = !favs.has(k)
    setFavs((s) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n })
    const err = await toggleFav(space.id, session.user.id, p.name, p.unit, on)
    if (err) { setFavs((s) => { const n = new Set(s); if (on) n.delete(k); else n.add(k); return n }); setToast({ text: t('products.changeFail', { msg: err }) }) }
    else {
      setFavNames((l) => (on ? [...l, p.name] : l.filter((x) => favKey(x) !== k)))
      setToast({ text: on ? t('products.favOn', { name: p.name }) : t('products.favOff') })
    }
  }
  useEffect(() => {
    const on = async () => { if (await flush()) void load(0) }
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  })

  // История названий для подсказок: один лёгкий запрос при открытии формы
  useEffect(() => {
    if (!adding || !space || isOffline() || histFor === space.id) return
    setHistFor(space.id)
    void supabase.from('products').select('name,unit,location,shelf_life_days').eq('space_id', space.id)
      .order('created_at', { ascending: false }).limit(300).then(({ data }) => {
        const m: typeof hist = {}
        for (const r of data ?? []) { const k = r.name.trim().toLowerCase(); if (!m[k]) m[k] = { name: r.name, unit: r.unit, location: r.location, days: r.shelf_life_days } }
        setHist(m)
      })
  }, [adding, space, histFor])

  function onName(v: string) {
    setNm(v)
    const h = hist[v.trim().toLowerCase()]
    if (h && !bc) {
      setUnitV(h.unit); setLocV(h.location ?? '')
      if (h.days && !exp.amount) setExp((e) => ({ ...e, mode: 'life', amount: String(h.days), unit: 'days' }))
      setAutofilled(true)
    } else setAutofilled(false)
  }

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
    const r = await run({ t: 'update', table: 'products', id: p.id, patch: { status } })
    if (!r.ok) { setItems((l) => [p, ...l]); setToast({ text: t('products.saveFail', { msg: r.message }) }); return }
    if (!space || !session) return
    const shop = () => addToShopping(space.id, session.user.id, { name: p.name, unit: p.unit })
    if (status === 'consumed' && (autoShopEnabled() || favs.has(favKey(p.name)))) {
      const r = await shop()
      setToast({ text: r === 'added' ? t('products.shopAdded', { name: p.name }) : t('products.shopExists', { name: p.name }) })
    } else if (status === 'discarded') {
      setToast({ text: t('products.discarded', { name: p.name }), action: { label: t('products.toShop'), run: () => { void shop(); setToast(null) } } })
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
      quantity: Number(f.get('quantity') || 1), unit: String(f.get('unit') || defaultUnit()),
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
    const r = await run({ t: 'insert', table: 'products', row })
    if (!r.ok) { setToast({ text: t('products.saveFail', { msg: r.message }) }); return }
    if (r.queued) { setItems((l) => [row as unknown as Product, ...l]); setToast({ text: t('products.queued') }) }
    else await load(0)
    if (fromShop) { await run({ t: 'delete', table: 'shopping_items', id: fromShop }); setFromShop(null) }
    setAdding(false); setExp(emptyExpiry()); setNm(''); setBc(null); setBcMsg(null); setUnitV(defaultUnit()); setLocV(''); setAutofilled(false)
  }

  async function onBarcode(code: string) {
    setScanning(false); setBc(code); setBcMsg(t('products.bcSearching'))
    const found = space ? await lookupBarcode(code, space.id) : null
    if (found) { setNm(found.name); setBcMsg(found.source === 'history' ? t('products.bcHistory') : t('products.bcOff')) }
    else setBcMsg(t('products.bcNone'))
  }

  function startEdit(p: Product) { setEditing(p); setEditExp(toExpiryState(p)); setOpenedOn(null) }

  // «Вскрыл сегодня»: после вскрытия продукт хранится меньше — срок становится ближайшим из прежнего и «сегодня + N дней».
  function markOpened() {
    const n = Math.max(1, Math.min(365, Number(openDays) || 1))
    const limit = addPeriod(todayIso(), n, 'days')
    const cur = computeExpiry(editExp)
    setEditExp({ ...editExp, mode: 'until', until: cur && cur < limit ? cur : limit })
    setOpenedOn(todayIso())
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const f = new FormData(e.currentTarget)
    const patch = {
      name: String(f.get('name')).trim() || editing.name,
      quantity: Number(f.get('quantity') || 0), unit: String(f.get('unit') || defaultUnit()),
      location: String(f.get('location') || '') || null,
      ...expiryFields(editExp),
      ...(openedOn ? { opened_on: openedOn } : {}),
    }
    const before = items
    setItems((l) => l.map((x) => (x.id === editing.id ? { ...x, ...patch } : x)))
    const r = await run({ t: 'update', table: 'products', id: editing.id, patch })
    if (!r.ok) { setItems(before); setToast({ text: t('products.saveFail', { msg: r.message }) }); return }
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
      if (locF && (p.location ?? '').trim().toLowerCase() !== locF) return false
      if (filter === 'fav' && !favs.has(favKey(p.name))) return false
      if (needle && !(p.name + ' ' + (p.location ?? '')).toLowerCase().includes(needle)) return false
      const d = daysLeft(p.expires_on)
      if (filter === 'expired') return d !== null && d < 0
      if (filter === 'soon') return d !== null && d >= 0 && d <= 3
      return true
    })
  }, [items, q, filter, locF, favs])

  const locations = useMemo(() => [...new Set(items.map((p) => (p.location ?? '').trim().toLowerCase()).filter(Boolean))].slice(0, 8), [items])

  const chip = (f: Filter, label: string, n?: number, tone = '') => (
    <button key={f} onClick={() => setFilter(f)} className={cn('h-8 rounded-full border px-3 text-xs font-medium', filter === f ? 'border-brand bg-brand-solid text-[#ffffff]' : 'border-green-200 bg-white ' + tone)}>
      {label}{n !== undefined && n > 0 ? ` · ${n}` : ''}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><img src="/icon-192.png" alt="" className="fs-float h-9 w-9 rounded-xl shadow-sm" /><h2 className="text-xl font-bold tracking-tight">{t('products.title')}</h2></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild><Link to="/scan"><ScanLine size={16} />{t('products.receipt')}</Link></Button>
          <Button size="sm" onClick={() => setAdding(!adding)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? t('common.cancel') : t('common.add')}</Button>
        </div>
      </div>

      {adding && (
        <Card>
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{t('products.name')}</Label>
              <div className="flex gap-2">
                <Input name="name" required maxLength={120} autoFocus list="fs-names" autoComplete="off" value={nm} onChange={(e) => onName(e.target.value)} />
                <datalist id="fs-names">{Object.values(hist).slice(0, 100).map((h) => <option key={h.name} value={h.name} />)}</datalist>
                <Button type="button" variant="outline" size="icon" title={t('products.scanBarcode')} onClick={() => setScanning(true)}><Barcode size={18} /></Button>
              </div>
              {!nm && favNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {favNames.slice(0, 12).map((n) => <button key={n} type="button" onClick={() => onName(n)} className="fs-pop rounded-full border border-green-200 bg-white px-2.5 py-1 text-xs">★ {n}</button>)}
                </div>
              )}
              {autofilled && <p className="mt-1 text-xs text-green-800">{t('products.autofilled')}</p>}
              {bc && <p className="mt-1 text-xs text-green-900/70">{t('products.barcode')} {bc}{bcMsg ? ` · ${bcMsg}` : ''} <button type="button" className="underline" onClick={() => { setBc(null); setBcMsg(null) }}>{t('products.remove')}</button></p>}
            </div>
            <div><Label>{t('products.qty')}</Label><Input name="quantity" type="number" step="any" min="0" defaultValue={1} /></div>
            <div><Label>{t('products.unit')}</Label><Input name="unit" value={unitV} onChange={(e) => setUnitV(e.target.value)} /></div>
            <div className="col-span-2"><Label>{t('products.place')}</Label><Input name="location" placeholder={t('products.placePh')} value={locV} onChange={(e) => setLocV(e.target.value)} /></div>
            <div className="col-span-2"><ExpiryField value={exp} onChange={setExp} hintDays={typicalDays(nm)} /></div>
            <div className="col-span-2">
              <Label>{t('products.photo')}</Label>
              <Input name="photo" type="file" accept="image/*" capture="environment" className="h-auto py-2" />
            </div>
            <Button className="col-span-2"><Camera size={16} />{t('common.save')}</Button>
          </form>
        </Card>
      )}

      {scanning && <BarcodeScanner onDetect={onBarcode} onClose={() => setScanning(false)} />}

      {items.length > 0 && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900/40" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('products.search')} className="pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {chip('all', t('products.fAll'))}
            {chip('soon', t('products.fSoon'), stats.soon)}
            {chip('expired', t('products.fExpired'), stats.expired, stats.expired ? 'text-red-700' : '')}
            {favs.size > 0 && chip('fav', t('products.fFav'))}
          </div>
          {locations.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {locations.map((l) => (
                <button key={l} onClick={() => setLocF(locF === l ? null : l)} className={cn('h-7 shrink-0 rounded-full border px-3 text-xs capitalize', locF === l ? 'border-brand bg-brand-soft font-medium' : 'border-green-100 bg-white text-green-900/70')}>{l}</button>
              ))}
            </div>
          )}
        </>
      )}

      {!items.length && !loading && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <img src="/logo-pair.webp" alt="" className="h-36 w-auto" />
          <p className="text-sm text-green-900/60">{t('products.empty')}</p>
        </div>
      )}
      {items.length > 0 && !shown.length && <p className="py-6 text-center text-sm text-green-900/60">{t('products.notFound')}</p>}

      {shown.map((p, idx) => editing?.id === p.id ? (
        <Card key={p.id}>
          <form onSubmit={saveEdit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>{t('products.name')}</Label><Input name="name" required maxLength={120} defaultValue={p.name} /></div>
            <div><Label>{t('products.qty')}</Label><Input name="quantity" type="number" step="any" min="0" defaultValue={p.quantity} /></div>
            <div><Label>{t('products.unit')}</Label><Input name="unit" defaultValue={p.unit} /></div>
            <div className="col-span-2"><Label>{t('products.place')}</Label><Input name="location" defaultValue={p.location ?? ''} placeholder={t('products.placePh')} /></div>
            <div className="col-span-2"><ExpiryField value={editExp} onChange={setEditExp} /></div>
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-brand-soft p-2 text-xs">
              <span className="shrink-0">{t('products.afterOpen')}</span>
              <input type="number" min={1} max={365} value={openDays} onChange={(e) => setOpenDays(e.target.value)} className="h-8 w-14 rounded-md border border-green-200 bg-white px-2 text-center text-sm" aria-label={t('products.openDaysAria')} />
              <span className="shrink-0">{t('products.daysShort')}</span>
              <button type="button" onClick={markOpened} className="ml-auto h-8 shrink-0 rounded-md bg-brand-solid px-3 font-medium text-[#ffffff]">{t('products.openedToday')}</button>
            </div>
            {openedOn && <p className="col-span-2 text-xs text-green-900/70">{t('products.recalc')}</p>}
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button>{t('common.save')}</Button>
          </form>
        </Card>
      ) : (
        <SwipeRow key={p.id} onRight={() => setStatus(p, 'consumed')} onLeft={() => setStatus(p, 'discarded')} style={{ animationDelay: `${Math.min(idx, 10) * 45}ms` }} className="fs-rise"><Card className={cn("flex items-start gap-3 border-l-4 p-3", edgeTone(p.expires_on))}>
          {p.photo_path && thumbs[p.photo_path]
            ? <img src={thumbs[p.photo_path]} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            : p.photo_url && !badImg.has(p.id)
              ? <img src={p.photo_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBadImg((b) => new Set(b).add(p.id))} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
              : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-2xl">{foodEmoji(p.name)}</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1">
              <span className="min-w-0 break-words font-medium leading-snug">{p.name}</span>
              <button type="button" aria-label={t('products.favorite')} aria-pressed={favs.has(favKey(p.name))} onClick={() => void star(p)} className="shrink-0 p-0.5"><Star size={16} className={favs.has(favKey(p.name)) ? 'fill-yellow-400 text-yellow-500' : 'text-green-900/30'} /></button>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-green-900/60">
              <span className="inline-flex items-center gap-1">{p.quantity} {p.unit}<button type="button" onClick={() => void usePart(p)} aria-label={t('products.usedPart')} title={t('products.usedPart')} className="flex h-5 w-5 items-center justify-center rounded-full border border-green-200 bg-white text-xs font-bold leading-none text-green-900/70">−</button></span>{p.brand && <span>· {p.brand}</span>}{p.location && <span>· {p.location}</span>}{p.produced_on && <span>· {t('products.produced', { date: fmt(p.produced_on) })}</span>}
            </div>
            <div className="mt-1.5"><ExpiryBadge date={p.expires_on} /></div>
          </div>
          <div className="-mr-1 flex shrink-0">
            <Button variant="ghost" size="icon" title={t('products.edit')} onClick={() => startEdit(p)}><Pencil size={16} className="text-green-900/60" /></Button>
            <Button variant="ghost" size="icon" title={t('products.consumed')} onClick={() => setStatus(p, 'consumed')}><Check size={18} className="text-brand" /></Button>
            <Button variant="ghost" size="icon" title={t('products.thrownTitle')} onClick={() => setStatus(p, 'discarded')}><Trash2 size={18} className="text-red-600" /></Button>
          </div>
        </Card></SwipeRow>
      ))}
      {shown.length > 0 && <p className="pt-1 text-center text-xs text-green-900/50">{t('products.swipeHint')}</p>}
      {more && <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(items.length)}>{t('products.more')}</Button>}

      {toast && (
        <div className="fs-toast fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-green-950 px-4 py-3 text-sm text-[#ffffff] shadow-lg">
          <span>{toast.text}</span>
          {toast.action && <button className="shrink-0 font-semibold text-green-300 underline" onClick={toast.action.run}>{toast.action.label}</button>}
        </div>
      )}
    </div>
  )
}
