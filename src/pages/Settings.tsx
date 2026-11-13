import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { autoShopEnabled, setAutoShop } from '@/lib/shopping'
import { currentSubscription, disablePush, enablePush, isIos, isStandalone, pushSupported, testPush } from '@/lib/push'

export default function Settings() {
  const { session, space } = useApp()
  const [stat, setStat] = useState<{ eaten: number; thrown: number } | null>(null)
  const [days, setDays] = useState(3)
  const [pushOn, setPushOn] = useState(false)
  const [autoShop, setAutoShopState] = useState(autoShopEnabled())
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
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
      if (pushOn) { await disablePush(); setPushOn(false); setPushMsg('Уведомления выключены') }
      else { await enablePush(session.user.id); setPushOn(true); setPushMsg('Готово: уведомления приходят раз в день в 09:00 по Москве') }
    } catch (e) { setPushMsg(e instanceof Error ? e.message : String(e)) }
    setPushBusy(false)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Настройки</h2>
      {stat && (
        <Card className="space-y-1">
          <p className="text-xs font-medium text-green-900/60">За 30 дней{space ? ` · ${space.name}` : ''}</p>
          <div className="flex gap-6">
            <div><div className="text-2xl font-bold text-brand">{stat.eaten}</div><div className="text-xs text-green-900/60">использовано</div></div>
            <div><div className="text-2xl font-bold text-red-600">{stat.thrown}</div><div className="text-xs text-green-900/60">выброшено</div></div>
            {stat.eaten + stat.thrown > 0 && <div><div className="text-2xl font-bold">{Math.round((stat.eaten / (stat.eaten + stat.thrown)) * 100)}%</div><div className="text-xs text-green-900/60">спасено</div></div>}
          </div>
        </Card>
      )}
      <Card className="space-y-3">
        <div><Label>Напоминать о сроке за (дней)</Label><Input type="number" min={0} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        <Button onClick={save}>Сохранить</Button>
        <label className="flex items-start gap-3 border-t border-green-100 pt-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-green-700" checked={autoShop} onChange={(e) => { setAutoShop(e.target.checked); setAutoShopState(e.target.checked) }} />
          <span>Добавлять в список покупок продукты, отмеченные «использовано»<span className="block text-xs text-green-900/60">Выброшенные можно добавить вручную из подсказки.</span></span>
        </label>
        <div className="space-y-2 border-t border-green-100 pt-3 text-sm">
          <p>Уведомления о сроках: <b>{pushOn ? 'включены' : 'выключены'}</b></p>
          {!pushSupported() ? (
            <p className="text-xs text-orange-800">{isIos() && !isStandalone()
              ? 'На iPhone уведомления работают только из установленного приложения: в Safari нажмите «Поделиться» → «На экран Домой», откройте приложение с иконки и вернитесь сюда (нужен iOS 16.4 или новее).'
              : 'Этот браузер не поддерживает push-уведомления.'}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant={pushOn ? 'outline' : 'default'} disabled={pushBusy} onClick={togglePush}>{pushOn ? 'Выключить' : 'Включить уведомления'}</Button>
              {pushOn && <Button variant="outline" disabled={pushBusy} onClick={async () => { setPushBusy(true); setPushMsg(await testPush()); setPushBusy(false) }}>Проверить</Button>}
            </div>
          )}
          {pushMsg && <p className="text-xs text-green-900/80">{pushMsg}</p>}
          <p className="text-xs text-green-900/60">Раз в день в 09:00 (Москва) приходит сводка: что просрочено и что скоро испортится. Порог задаётся выше.</p>
        </div>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>Выйти из аккаунта</Button>
    </div>
  )
}
