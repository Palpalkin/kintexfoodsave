import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { useT, locale } from '@/lib/i18n'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { InstallCard } from '@/components/InstallCard'
import { WidgetCard } from '@/components/WidgetCard'
import { LegalLinks } from '@/pages/Legal'
import { exportData } from '@/lib/export'
import { autoShopEnabled, setAutoShop } from '@/lib/shopping'
import { currentSubscription, disablePush, enablePush, isIos, isStandalone, pushSupported, testPush } from '@/lib/push'

export default function Settings() {
  const { session, space } = useApp()
  const tt = useT()
  const [stat, setStat] = useState<{ eaten: number; thrown: number } | null>(null)
  const [days, setDays] = useState(3)
  const [pushOn, setPushOn] = useState(false)
  const [autoShop, setAutoShopState] = useState(autoShopEnabled())
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [spent, setSpent] = useState<{ month: number; thrown: number } | null>(null)
  const [expMsg, setExpMsg] = useState<string | null>(null)
  useEffect(() => { void currentSubscription().then((s) => setPushOn(!!s)).catch(() => {}) }, [])

  useEffect(() => {
    supabase.from('user_settings').select('notify_days_before').maybeSingle().then(({ data }) => { if (data) { setDays(data.notify_days_before); localStorage.setItem('fs.notifyDays', String(data.notify_days_before)) } })
  }, [])

  // Статистика за 30 дней: два дешёвых запроса-счётчика, только при открытии экрана
  useEffect(() => {
    if (!space || !navigator.onLine) return
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const count = (status: string) => supabase.from('products').select('id', { count: 'exact', head: true }).eq('space_id', space.id).eq('status', status).gte('updated_at', since)
    Promise.all([count('consumed'), count('discarded')]).then(([a, b]) => setStat({ eaten: a.count ?? 0, thrown: b.count ?? 0 }))
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0)
    supabase.from('products').select('price,status,created_at').eq('space_id', space.id).not('price', 'is', null).gte('created_at', m.toISOString()).limit(2000)
      .then(({ data }) => {
        const rows = data ?? []
        setSpent({ month: rows.reduce((a, r) => a + Number(r.price), 0), thrown: rows.filter((r) => r.status === 'discarded').reduce((a, r) => a + Number(r.price), 0) })
      })
  }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!session) return
    await supabase.from('user_settings').upsert({ user_id: session.user.id, notify_days_before: days })
    localStorage.setItem('fs.notifyDays', String(days))
  }
  async function togglePush() {
    if (!session) return
    setPushBusy(true); setPushMsg(null)
    try {
      if (pushOn) { await disablePush(); setPushOn(false); setPushMsg(tt('settings.pushOff')) }
      else { await enablePush(session.user.id); setPushOn(true); setPushMsg(tt('settings.pushOnDone')) }
    } catch (e) { setPushMsg(e instanceof Error ? e.message : String(e)) }
    setPushBusy(false)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{tt('settings.title')}</h2>
      <Card className="flex items-center justify-between"><span className="font-medium">{tt('lang.label')} / Language</span><LanguageSwitch userId={session?.user.id} /></Card>
      <InstallCard />
      <WidgetCard />
      {stat && (
        <Card className="space-y-1">
          <p className="text-xs font-medium text-green-900/60">{tt('settings.last30')}{space ? ` · ${space.name}` : ''}</p>
          <div className="flex gap-6">
            <div><div className="text-2xl font-bold text-brand">{stat.eaten}</div><div className="text-xs text-green-900/60">{tt('settings.used')}</div></div>
            <div><div className="text-2xl font-bold text-red-600">{stat.thrown}</div><div className="text-xs text-green-900/60">{tt('settings.thrown')}</div></div>
            {stat.eaten + stat.thrown > 0 && <div><div className="text-2xl font-bold">{Math.round((stat.eaten / (stat.eaten + stat.thrown)) * 100)}%</div><div className="text-xs text-green-900/60">{tt('settings.saved')}</div></div>}
          </div>
        </Card>
      )}
      <Card className="space-y-3">
        <div><Label>{tt('settings.notifyDays')}</Label><Input type="number" min={0} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        <Button onClick={save}>{tt('settings.save')}</Button>
        <label className="flex items-start gap-3 border-t border-green-100 pt-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-green-700" checked={autoShop} onChange={(e) => { setAutoShop(e.target.checked); setAutoShopState(e.target.checked) }} />
          <span>{tt('settings.autoShop')}<span className="block text-xs text-green-900/60">{tt('settings.autoShopHint')}</span></span>
        </label>
        <div className="space-y-2 border-t border-green-100 pt-3 text-sm">
          <p>{tt('settings.pushStatus')} <b>{pushOn ? tt('settings.on') : tt('settings.off')}</b></p>
          {!pushSupported() ? (
            <p className="text-xs text-orange-800">{isIos() && !isStandalone()
              ? tt('settings.iosPush')
              : tt('settings.noPush')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant={pushOn ? 'outline' : 'default'} disabled={pushBusy} onClick={togglePush}>{pushOn ? tt('settings.disable') : tt('settings.enable')}</Button>
              {pushOn && <Button variant="outline" disabled={pushBusy} onClick={async () => { setPushBusy(true); setPushMsg(await testPush()); setPushBusy(false) }}>{tt('settings.test')}</Button>}
            </div>
          )}
          {pushMsg && <p className="text-xs text-green-900/80">{pushMsg}</p>}
          <p className="text-xs text-green-900/60">{tt('settings.pushInfo')}</p>
        </div>
      </Card>
      <Link to="/stats" className="block rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-medium text-brand shadow-sm">{tt('settings.statsLink')}</Link>
      {spent && spent.month > 0 && (
        <Card className="space-y-1">
          <p className="text-xs font-medium text-green-900/60">{tt('settings.spentTitle')}</p>
          <div className="flex gap-6">
            <div><div className="text-2xl font-bold">{Math.round(spent.month).toLocaleString(locale())} ₽</div><div className="text-xs text-green-900/60">{tt('settings.bought')}</div></div>
            <div><div className="text-2xl font-bold text-red-600">{Math.round(spent.thrown).toLocaleString(locale())} ₽</div><div className="text-xs text-green-900/60">{tt('settings.thrown')}</div></div>
          </div>
        </Card>
      )}
      {space && (
        <Card className="space-y-2">
          <h3 className="font-semibold">{tt('settings.export')}</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={async () => setExpMsg(await exportData(space.id, 'csv'))}>CSV (Excel)</Button>
            <Button variant="outline" className="flex-1" onClick={async () => setExpMsg(await exportData(space.id, 'json'))}>{tt('settings.exportJson')}</Button>
          </div>
          {expMsg && <p className="text-xs text-green-900/80">{expMsg}</p>}
        </Card>
      )}
      <Button variant="outline" className="w-full" onClick={() => window.dispatchEvent(new Event('fs-tour'))}>{tt('settings.tour')}</Button>
      <Card className="space-y-2 border-red-200">
        <h3 className="font-semibold">{tt('settings.delTitle')}</h3>
        <p className="text-xs text-green-900/70">{tt('settings.delInfo')}</p>
        <Button variant="outline" className="w-full text-red-600" onClick={async () => {
          if (!confirm(tt('settings.delConfirm1'))) return
          if (!confirm(tt('settings.delConfirm2'))) return
          const { error } = await supabase.rpc('delete_my_account')
          if (error) { setExpMsg(tt('settings.delFail', { msg: error.message })); return }
          try { localStorage.clear() } catch { /* */ }
          await supabase.auth.signOut(); location.href = '/'
        }}>{tt('settings.delBtn')}</Button>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>{tt('settings.signOut')}</Button>
      <p className="text-center text-xs text-green-900/50">{tt('settings.off.credit')}</p>
      <LegalLinks />
    </div>
  )
}
