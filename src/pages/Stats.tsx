import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { cacheGet, cacheSet } from '@/lib/cache'
import { locale, tp, useT } from '@/lib/i18n'
import { summarize, type Gone } from '@/lib/stats'
import { achievements, level } from '@/lib/achievements'
import { Card } from '@/components/ui/card'
import { ListSkeleton } from '@/components/Splash'

export default function Stats() {
  const t = useT()
  const { space } = useApp()
  const [rows, setRows] = useState<Gone[] | null>(null)

  useEffect(() => {
    if (!space) return
    const key = 'stats.' + space.id
    if (!navigator.onLine) { setRows(cacheGet<Gone[]>(key) ?? []); return }
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0)
    supabase.from('products').select('name,status,price,updated_at').eq('space_id', space.id).neq('status', 'active')
      .gte('updated_at', since.toISOString()).limit(3000)
      .then(({ data }) => { const r = (data ?? []) as Gone[]; setRows(r); cacheSet(key, r) })
  }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = useMemo(() => summarize(rows ?? []), [rows])
  const ach = useMemo(() => achievements(rows ?? [], s.streak), [rows, s.streak])
  const lv = level(ach.eaten)
  const max = Math.max(1, ...s.months.map((m) => m.eaten + m.thrown))
  const total = s.months.reduce((a, m) => ({ e: a.e + m.eaten, t: a.t + m.thrown, l: a.l + m.lost }), { e: 0, t: 0, l: 0 })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link to="/settings" aria-label={t('common.back')} className="rounded-full p-1 hover:bg-green-100"><ChevronLeft size={22} /></Link>
        <h2 className="text-lg font-semibold">{t('stats.title')}</h2>
      </div>
      {rows === null ? <ListSkeleton rows={3} /> : (
        <>
          {s.streak !== null || total.e > 0 ? (
            <Card className="fs-rise flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-800"><Flame size={26} /></span>
              <div>
                <div className="text-2xl font-bold">{s.streak ?? '—'}{s.streak !== null && ' ' + t('stats.daysShort')}</div>
                <div className="text-xs text-green-900/60">{s.streak === null ? t('stats.noWaste') : t('stats.streak')}</div>
              </div>
            </Card>
          ) : null}

          <Card className="fs-rise space-y-2">
            <div className="flex items-baseline justify-between"><span className="text-lg font-bold">{t('level.title', { lv: lv.lv })}</span><span className="text-xs text-green-900/60">{ach.eaten} {t('level.used')}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-green-100"><div className="h-full rounded-full bg-brand-solid transition-all duration-700" style={{ width: lv.pct + '%' }} /></div>
            <p className="text-xs text-green-900/60">{lv.next === null ? t('level.max') : t('level.next', { n: lv.next - ach.eaten })}</p>
          </Card>
          <Card className="fs-rise space-y-2">
            <p className="text-xs font-medium text-green-900/60">{t('week.title')}</p>
            <p className="text-sm">{ach.week.have >= ach.week.goal ? t('week.done') : t('week.text', { goal: ach.week.goal })}</p>
            <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500 transition-all duration-700" style={{ width: Math.min(100, (ach.week.have / ach.week.goal) * 100) + '%' }} /></div><span className="text-xs font-medium">{Math.min(ach.week.have, ach.week.goal)}/{ach.week.goal}</span></div>
          </Card>
          <Card className="fs-rise space-y-2">
            <p className="text-xs font-medium text-green-900/60">{t('badges.title')}</p>
            <div className="grid grid-cols-4 gap-2">
              {ach.badges.map((b) => (
                <div key={b.id} title={t('badge.' + b.id)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${b.done ? 'border-brand bg-brand-soft' : 'border-green-100 opacity-50 grayscale'}`}>
                  <span className="text-2xl">{b.icon}</span><span className="text-[10px] leading-tight">{t('badge.' + b.id)}</span>
                  {!b.done && <span className="text-[10px] text-green-900/60">{b.have}/{b.goal}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="fs-rise space-y-3">
            <p className="text-xs font-medium text-green-900/60">{t('stats.last6')}</p>
            <div className="flex h-36 items-end gap-2" role="img" aria-label={t('stats.chartLabel')}>
              {s.months.map((m) => (
                <div key={m.key} className="flex h-full flex-1 flex-col justify-end gap-0.5 text-center">
                  <div className="flex flex-col justify-end overflow-hidden rounded-md" style={{ height: `${((m.eaten + m.thrown) / max) * 100}%`, minHeight: m.eaten + m.thrown ? 6 : 0 }}>
                    <div className="bg-red-500 transition-all duration-700" style={{ flexGrow: m.thrown }} />
                    <div className="bg-green-600 transition-all duration-700" style={{ flexGrow: m.eaten }} />
                  </div>
                  <span className="text-[10px] text-green-900/60">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-xs"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-green-600" />{t('stats.eaten', { n: total.e })}</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-red-500" />{t('stats.thrown', { n: total.t })}</span></div>
            {total.l > 0 && <p className="text-sm">{t('stats.lostPre')} <b className="text-red-600">{Math.round(total.l).toLocaleString(locale())} {t('stats.currency')}</b> {t('stats.lostPost')}</p>}
          </Card>

          {s.top.length > 0 && (
            <Card className="fs-rise space-y-2">
              <p className="text-xs font-medium text-green-900/60">{t('stats.top')}</p>
              {s.top.map((x) => <div key={x.name} className="flex items-center justify-between text-sm"><span className="capitalize">{x.name}</span><span className="text-red-600">{tp('stats.times', x.n)}</span></div>)}
              <p className="text-xs text-green-900/60">{t('stats.tip')}</p>
            </Card>
          )}
          {total.e + total.t === 0 && <p className="py-6 text-center text-sm text-green-900/60">{t('stats.empty')}</p>}
          <p className="text-center text-xs text-green-900/50">{t('stats.note')}</p>
        </>
      )}
    </div>
  )
}
