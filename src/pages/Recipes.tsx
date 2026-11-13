import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Sparkles, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { matches, parseIngredients } from '@/lib/match'
import { daysLeft } from '@/lib/utils'
import type { Recipe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge, Card } from '@/components/ui/card'

type Draft = Omit<Recipe, 'id' | 'space_id' | 'source'>
type Stock = { name: string; expires_on: string | null }

export default function Recipes() {
  const { space, session } = useApp()
  const [list, setList] = useState<Recipe[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [draft, setDraft] = useState<Draft[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function load() {
    if (!space) return
    const key = 'recipes.' + space.id
    if (!navigator.onLine) { setList(cacheGet<Recipe[]>(key) ?? []); setStock(cacheGet<Stock[]>('stock.' + space.id) ?? []); return }
    const [r, p] = await Promise.all([
      supabase.from('recipes').select('id,space_id,title,ingredients,instructions,source')
        .eq('space_id', space.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('products').select('name,expires_on').eq('space_id', space.id).eq('status', 'active')
        .order('expires_on', { ascending: true, nullsFirst: false }).limit(200),
    ])
    if (r.data) { setList(r.data as Recipe[]); cacheSet(key, r.data) }
    if (p.data) { setStock(p.data as Stock[]); cacheSet('stock.' + space.id, p.data) }
  }
  useEffect(() => { void load() }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Подбор из сохранённых рецептов по продуктам в наличии: сначала те, что используют скоро портящееся.
  const ranked = useMemo(() => {
    return list.map((r) => {
      const have: string[] = []; const saves: { name: string; d: number }[] = []
      for (const ing of r.ingredients) {
        const hit = stock.find((s) => matches(ing.name, s.name))
        if (hit) {
          have.push(ing.name)
          const d = daysLeft(hit.expires_on)
          if (d !== null && d <= 5) saves.push({ name: hit.name, d })
        }
      }
      const total = r.ingredients.length || 1
      return { r, have: have.length, total, saves, score: have.length / total + saves.length * 0.5 }
    }).filter((x) => x.have > 0).sort((a, b) => b.score - a.score)
  }, [list, stock])

  async function suggest() {
    if (!space) return
    setBusy(true); setErr(null)
    const { data, error } = await supabase.functions.invoke('ai-recipes', { body: { products: stock.slice(0, 25).map((s) => ({ name: s.name, quantity: 1, unit: 'шт', expires_on: s.expires_on })) } })
    if (error || data?.error) {
      let m = data?.error as string | undefined
      if (!m && error && 'context' in error) { try { m = (await (error as { context: Response }).context.json()).error } catch { /* */ } }
      setErr(m ?? error?.message ?? 'Ошибка AI')
    } else setDraft(data.recipes ?? [])
    setBusy(false)
  }

  async function save(d: Draft, source: 'ai' | 'manual') {
    if (!space || !session) return
    const { error } = await supabase.from('recipes').insert({ ...d, space_id: space.id, created_by: session.user.id, source })
    if (error) { setErr(error.message); return }
    setDraft((x) => x.filter((r) => r !== d)); await load()
  }

  async function addManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await save({ title: String(f.get('title')).trim(), ingredients: parseIngredients(String(f.get('ingredients'))), instructions: String(f.get('instructions')).trim() }, 'manual')
    setAdding(false)
  }

  const view = (r: Draft, actions: React.ReactNode, k: string, extra?: React.ReactNode) => (
    <Card key={k} className="space-y-2">
      <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{r.title}</h3>{actions}</div>
      {extra}
      <p className="text-xs text-green-900/70">{r.ingredients.map((i) => i.name + (i.amount ? ` (${i.amount})` : '')).join(', ')}</p>
      <p className="whitespace-pre-line text-sm">{r.instructions}</p>
    </Card>
  )

  const del = (id: string) => (
    <Button size="icon" variant="ghost" onClick={async () => { await supabase.from('recipes').delete().eq('id', id); void load() }}><Trash2 size={16} className="text-red-600" /></Button>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Рецепты</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={suggest} disabled={busy || !stock.length} title="Нужен ключ AI в настройках Supabase"><Sparkles size={16} />{busy ? 'Думаю…' : 'AI-идеи'}</Button>
          <Button size="sm" onClick={() => setAdding(!adding)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? 'Отмена' : 'Свой'}</Button>
        </div>
      </div>

      {adding && (
        <Card>
          <form onSubmit={addManual} className="space-y-3">
            <div><Label>Название</Label><Input name="title" required maxLength={160} autoFocus /></div>
            <div>
              <Label>Ингредиенты (по одному в строке: «молоко - 200 мл»)</Label>
              <textarea name="ingredients" required rows={5} className="w-full rounded-lg border border-green-200 bg-white p-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-green-200" placeholder={'яйца - 3 шт\nмолоко - 200 мл\nмука - 150 г'} />
            </div>
            <div>
              <Label>Приготовление</Label>
              <textarea name="instructions" rows={5} className="w-full rounded-lg border border-green-200 bg-white p-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-green-200" />
            </div>
            <Button className="w-full">Сохранить рецепт</Button>
          </form>
        </Card>
      )}

      {err && <Card className="border-orange-200 bg-orange-50 text-sm text-orange-900">{err}</Card>}
      {draft.map((r, i) => view(r, <Button size="sm" variant="outline" onClick={() => save(r, 'ai')}>Сохранить</Button>, 'd' + i))}

      {ranked.length > 0 && (
        <>
          <h3 className="pt-1 text-sm font-semibold text-green-900/80">Можно приготовить из ваших продуктов</h3>
          {ranked.slice(0, 5).map(({ r, have, total, saves }) => view(r, del(r.id), 'rk' + r.id, (
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-green-100 text-green-800">есть {have} из {total}</Badge>
              {saves.slice(0, 3).map((s) => <Badge key={s.name} className="bg-orange-100 text-orange-800">спасёт: {s.name}{s.d >= 0 ? ` (${s.d} дн.)` : ' (просрочен)'}</Badge>)}
            </div>
          )))}
          <h3 className="pt-1 text-sm font-semibold text-green-900/80">Все рецепты</h3>
        </>
      )}
      {list.filter((r) => !ranked.slice(0, 5).some((x) => x.r.id === r.id)).map((r) => view(r, del(r.id), r.id))}
      {!list.length && !draft.length && <p className="py-10 text-center text-sm text-green-900/60">Рецептов пока нет. Нажмите «Свой», чтобы добавить рецепт: приложение будет подсказывать, что приготовить из имеющихся продуктов.</p>}
    </div>
  )
}
