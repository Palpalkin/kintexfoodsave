import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Camera, Check, Plus, ScanLine, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { compressImage } from '@/lib/image'
import { enqueue, flush, isOffline } from '@/lib/outbox'
import { cn, daysLeft } from '@/lib/utils'
import { ExpiryField } from '@/components/ExpiryField'
import { emptyExpiry, expiryFields, fmt } from '@/lib/expiry'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge, Card } from '@/components/ui/card'

const PAGE = 30
const COLS = 'id,space_id,name,category,quantity,unit,location,expires_on,produced_on,notes,photo_path,status'

function ExpiryBadge({ date }: { date: string | null }) {
  const d = daysLeft(date)
  if (d === null) return <Badge className="bg-gray-100 text-gray-600">без срока</Badge>
  if (d < 0) return <Badge className="bg-red-100 text-red-800">просрочено {-d} дн.</Badge>
  if (d === 0) return <Badge className="bg-red-100 text-red-800">сегодня</Badge>
  if (d <= 3) return <Badge className="bg-orange-100 text-orange-800">{d} дн.</Badge>
  if (d <= 7) return <Badge className="bg-yellow-100 text-yellow-800">{d} дн.</Badge>
  return <Badge className="bg-green-100 text-green-800">{d} дн.</Badge>
}

export default function Products() {
  const { space, session } = useApp()
  const [items, setItems] = useState<Product[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [exp, setExp] = useState(emptyExpiry())

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

  async function setStatus(p: Product, status: 'consumed' | 'discarded') {
    setItems((l) => l.filter((x) => x.id !== p.id))
    if (isOffline()) enqueue({ t: 'update', table: 'products', id: p.id, patch: { status } })
    else await supabase.from('products').update({ status }).eq('id', p.id)
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
    setAdding(false); setExp(emptyExpiry())
  }

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
            <div className="col-span-2"><Label>Название</Label><Input name="name" required maxLength={120} autoFocus /></div>
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

      {!items.length && !loading && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <img src="/logo-pair.webp" alt="" className="h-36 w-auto" />
          <p className="text-sm text-green-900/60">Пока пусто. Добавьте продукт или отсканируйте чек.</p>
        </div>
      )}

      {items.map((p) => (
        <Card key={p.id} className="flex items-center gap-3 p-3">
          {p.photo_path && thumbs[p.photo_path]
            ? <img src={thumbs[p.photo_path]} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
            : <div className="h-12 w-12 rounded-lg bg-brand-soft" />}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{p.name}</div>
            <div className="flex items-center gap-2 text-xs text-green-900/60">
              <span>{p.quantity} {p.unit}</span>{p.location && <span>· {p.location}</span>}{p.produced_on && <span>· произв. {fmt(p.produced_on)}</span>}
            </div>
          </div>
          <ExpiryBadge date={p.expires_on} />
          <Button variant="ghost" size="icon" title="Использовано" onClick={() => setStatus(p, 'consumed')}><Check size={18} className="text-brand" /></Button>
          <Button variant="ghost" size="icon" title="Выброшено" onClick={() => setStatus(p, 'discarded')}><Trash2 size={18} className={cn('text-red-600')} /></Button>
        </Card>
      ))}
      {more && <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(items.length)}>Показать ещё</Button>}
    </div>
  )
}
