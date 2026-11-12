import { useEffect, useState } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import type { Recipe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Draft = Omit<Recipe, 'id' | 'space_id' | 'source'>

export default function Recipes() {
  const { space, session } = useApp()
  const [list, setList] = useState<Recipe[]>([])
  const [draft, setDraft] = useState<Draft[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    if (!space) return
    const key = 'recipes.' + space.id
    if (!navigator.onLine) { setList(cacheGet<Recipe[]>(key) ?? []); return }
    const { data } = await supabase.from('recipes').select('id,space_id,title,ingredients,instructions,source')
      .eq('space_id', space.id).order('created_at', { ascending: false }).limit(30)
    if (data) { setList(data as Recipe[]); cacheSet(key, data) }
  }
  useEffect(() => { void load() }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function suggest() {
    if (!space) return
    setBusy(true); setErr(null)
    const { data: prods } = await supabase.from('products').select('name,quantity,unit,expires_on')
      .eq('space_id', space.id).eq('status', 'active')
      .order('expires_on', { ascending: true, nullsFirst: false }).limit(25)
    const { data, error } = await supabase.functions.invoke('ai-recipes', { body: { products: prods ?? [] } })
    if (error || data?.error) {
      let m = data?.error as string | undefined
      if (!m && error && 'context' in error) { try { m = (await (error as { context: Response }).context.json()).error } catch { /* */ } }
      setErr(m ?? error?.message ?? 'Ошибка AI')
    } else setDraft(data.recipes ?? [])
    setBusy(false)
  }

  async function save(d: Draft) {
    if (!space || !session) return
    await supabase.from('recipes').insert({ ...d, space_id: space.id, created_by: session.user.id, source: 'ai' })
    setDraft((x) => x.filter((r) => r !== d)); await load()
  }

  const view = (r: Draft, actions: React.ReactNode, k: string) => (
    <Card key={k} className="space-y-2">
      <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{r.title}</h3>{actions}</div>
      <p className="text-xs text-green-900/70">{r.ingredients.map((i) => i.name + (i.amount ? ` (${i.amount})` : '')).join(', ')}</p>
      <p className="whitespace-pre-line text-sm">{r.instructions}</p>
    </Card>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Рецепты</h2>
        <Button size="sm" onClick={suggest} disabled={busy}><Sparkles size={16} />{busy ? 'Думаю…' : 'Из моих продуктов'}</Button>
      </div>
      {err && <Card className="border-orange-200 bg-orange-50 text-sm text-orange-900">{err}</Card>}
      {draft.map((r, i) => view(r, <Button size="sm" variant="outline" onClick={() => save(r)}>Сохранить</Button>, 'd' + i))}
      {list.map((r) => view(r, <Button size="icon" variant="ghost" onClick={async () => { await supabase.from('recipes').delete().eq('id', r.id); void load() }}><Trash2 size={16} className="text-red-600" /></Button>, r.id))}
      {!list.length && !draft.length && <p className="py-10 text-center text-sm text-green-900/60">Нет рецептов. Нажмите «Из моих продуктов», чтобы получить идеи.</p>}
    </div>
  )
}
