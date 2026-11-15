import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, Clock, Plus, ShoppingCart, Sparkles, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { matches, parseIngredients } from '@/lib/match'
import { daysLeft } from '@/lib/utils'
import { loadFavs } from '@/lib/favorites'
import { MEAL_LABEL, type Meal } from '@/lib/recipeBook'
import { pickRecipes } from '@/lib/recipePick'
import { addToShopping } from '@/lib/shopping'
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [meal, setMeal] = useState<Meal | null>(null)
  const [likes, setLikes] = useState<string[]>([])
  useEffect(() => { if (space) void loadFavs(space.id).then((f) => setLikes(f.map((x) => x.name))) }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const book = useMemo(() => pickRecipes(stock, likes), [stock, likes])

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

  async function buyMissing(missing: string[]) {
    if (!space || !session) return
    let n = 0
    for (const m of missing) if ((await addToShopping(space.id, session.user.id, { name: m })) === 'added') n++
    setNote(n ? `В список покупок добавлено: ${n}` : 'Всё это уже есть в списке покупок'); setTimeout(() => setNote(null), 3000)
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

      {stock.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-green-900/80">Что приготовить из ваших продуктов</h3>
          <div className="flex gap-2 overflow-x-auto">
            {(Object.keys(MEAL_LABEL) as Meal[]).map((m) => (
              <button key={m} onClick={() => setMeal(meal === m ? null : m)} className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${meal === m ? 'border-brand bg-brand-solid text-[#ffffff]' : 'border-green-200 bg-white'}`}>{MEAL_LABEL[m]}</button>
            ))}
          </div>
          {note && <p className="fs-pop rounded-lg bg-brand-soft px-3 py-2 text-xs">{note}</p>}
          {book.filter((b) => !meal || b.r.meals?.includes(meal)).length === 0 && <p className="text-sm text-green-900/60">Пока не нашли подходящих блюд. Добавьте больше продуктов (яйца, молоко, картофель, крупы, мясо, овощи) — подборка появится сама.</p>}
          {book.filter((b) => !meal || b.r.meals?.includes(meal)).slice(0, 12).map(({ r, have, missing, saves }) => (
            <Card key={r.id} className="fs-rise space-y-2 p-3">
              <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl">{r.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{r.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge className={missing.length ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>{missing.length ? `не хватает: ${missing.length}` : 'всё есть'}</Badge>
                    {saves.slice(0, 2).map((x) => <Badge key={x.name} className="bg-orange-100 text-orange-800">спасёт: {x.name}</Badge>)}
                    <span className="flex items-center gap-0.5 text-xs text-green-900/60"><Clock size={12} />{r.minutes} мин</span>
                  </span>
                </span>
                <ChevronDown size={18} className={`mt-1 shrink-0 transition-transform ${openId === r.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === r.id && (
                <div className="fs-fade space-y-2 text-sm">
                  <p className="text-xs"><span className="font-medium">Есть:</span> {have.join(', ')}.{missing.length > 0 && <> <span className="font-medium text-orange-800">Нужно докупить:</span> {missing.join(', ')}.</>}</p>
                  <p className="text-xs text-green-900/70">{r.ing.map((i) => i.name.split('|')[0] + (i.amount ? ` — ${i.amount}` : '')).join(' · ')}</p>
                  <p>{r.steps}</p>
                  <div className="flex gap-2">
                    {missing.length > 0 && <Button size="sm" variant="outline" onClick={() => buyMissing(missing)}><ShoppingCart size={14} />В покупки</Button>}
                    <Button size="sm" variant="outline" onClick={() => save({ title: r.title, ingredients: r.ing.map((i) => ({ name: i.name.split('|')[0], amount: i.amount })), instructions: r.steps }, 'manual')}>Сохранить себе</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {ranked.length > 0 && (
        <>
          <h3 className="pt-1 text-sm font-semibold text-green-900/80">Ваши рецепты, которые подходят</h3>
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
