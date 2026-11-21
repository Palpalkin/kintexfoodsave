import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { locale, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { foodEmoji } from '@/lib/emoji'
import { Card } from '@/components/ui/card'
import { ListSkeleton } from '@/components/Splash'

type P = { id: string; name: string; expires_on: string; quantity: number; unit: string }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CalendarPage() {
  const t = useT()
  const { space } = useApp()
  const [rows, setRows] = useState<P[] | null>(null)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [sel, setSel] = useState(iso(new Date()))
  const today = iso(new Date())

  useEffect(() => {
    if (!space) return
    const key = 'cal.' + space.id
    if (!navigator.onLine) { setRows(cacheGet<P[]>(key) ?? []); return }
    supabase.from('products').select('id,name,expires_on,quantity,unit').eq('space_id', space.id).eq('status', 'active')
      .not('expires_on', 'is', null).order('expires_on').limit(1000)
      .then(({ data }) => { const r = (data ?? []) as P[]; setRows(r); cacheSet(key, r) })
  }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => { const m = new Map<string, P[]>(); for (const r of rows ?? []) m.set(r.expires_on, [...(m.get(r.expires_on) ?? []), r]); return m }, [rows])
  const cells = useMemo(() => {
    const first = new Date(month), lead = (first.getDay() + 6) % 7 // неделя с понедельника
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(first.getFullYear(), first.getMonth(), i + 1)))] as (string | null)[]
  }, [month])
  const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' }))
  const tone = (d: string) => (d < today ? 'bg-red-500' : d <= iso(new Date(Date.now() + 3 * 864e5)) ? 'bg-orange-500' : 'bg-green-600')
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
  const list = byDay.get(sel) ?? []
  const mt = month.toLocaleDateString(locale(), { month: 'long', year: 'numeric' }).replace(/\s*г\.?$/i, '')
  const monthTitle = mt.charAt(0).toUpperCase() + mt.slice(1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link to="/" aria-label={t('common.back')} className="rounded-full p-1 hover:bg-green-100"><ChevronLeft size={22} /></Link>
        <h2 className="text-lg font-semibold">{t('calendar.title')}</h2>
      </div>
      {rows === null ? <ListSkeleton rows={3} /> : (
        <>
          <Card className="fs-rise space-y-2">
            <div className="flex items-center justify-between">
              <button aria-label="<" className="rounded-full p-1.5 hover:bg-green-100" onClick={() => shift(-1)}><ChevronLeft size={20} /></button>
              <span className="font-semibold">{monthTitle}</span>
              <button aria-label=">" className="rounded-full p-1.5 hover:bg-green-100" onClick={() => shift(1)}><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-green-900/60">{wd.map((w) => <span key={w}>{w}</span>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => d === null ? <span key={'e' + i} /> : (
                <button key={d} onClick={() => setSel(d)} className={cn('relative flex h-11 flex-col items-center justify-center rounded-xl border text-sm', d === sel ? 'border-brand bg-brand-soft font-semibold' : 'border-transparent', d === today && 'ring-1 ring-brand')}>
                  {Number(d.slice(8))}
                  {byDay.has(d) && <span className="mt-0.5 flex items-center gap-0.5"><i className={cn('h-1.5 w-1.5 rounded-full', tone(d))} />{byDay.get(d)!.length > 1 && <b className="text-[9px] leading-none">{byDay.get(d)!.length}</b>}</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-green-900/70">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" />{t('calendar.expired')}</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-500" />{t('calendar.soon')}</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-green-600" />{t('calendar.later')}</span>
            </div>
          </Card>
          <Card className="fs-rise space-y-2">
            <p className="text-sm font-semibold">{new Date(sel + 'T00:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            {list.length === 0 ? <p className="text-sm text-green-900/60">{t('calendar.none')}</p> : list.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-xl">{foodEmoji(p.name)}</span><span className="flex-1">{p.name}</span><span className="text-xs text-green-900/60">{p.quantity} {p.unit}</span></div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
