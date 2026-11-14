import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { LegalLinks } from '@/pages/Legal'
import { exportData } from '@/lib/export'
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
      <Link to="/stats" className="block rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-medium text-brand shadow-sm">📊 Подробная статистика по месяцам →</Link>
      {spent && spent.month > 0 && (
        <Card className="space-y-1">
          <p className="text-xs font-medium text-green-900/60">Траты по чекам в этом месяце</p>
          <div className="flex gap-6">
            <div><div className="text-2xl font-bold">{Math.round(spent.month).toLocaleString('ru-RU')} ₽</div><div className="text-xs text-green-900/60">куплено</div></div>
            <div><div className="text-2xl font-bold text-red-600">{Math.round(spent.thrown).toLocaleString('ru-RU')} ₽</div><div className="text-xs text-green-900/60">выброшено</div></div>
          </div>
        </Card>
      )}
      {space && (
        <Card className="space-y-2">
          <h3 className="font-semibold">Экспорт данных</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={async () => setExpMsg(await exportData(space.id, 'csv'))}>CSV (Excel)</Button>
            <Button variant="outline" className="flex-1" onClick={async () => setExpMsg(await exportData(space.id, 'json'))}>JSON-копия</Button>
          </div>
          {expMsg && <p className="text-xs text-green-900/80">{expMsg}</p>}
        </Card>
      )}
      <Button variant="outline" className="w-full" onClick={() => window.dispatchEvent(new Event('fs-tour'))}>Показать приветствие</Button>
      <Card className="space-y-2 border-red-200">
        <h3 className="font-semibold">Удалить аккаунт</h3>
        <p className="text-xs text-green-900/70">Безвозвратно удалит аккаунт, ваши пространства и все данные в них. Это же отзыв согласия на обработку персональных данных.</p>
        <Button variant="outline" className="w-full text-red-600" onClick={async () => {
          if (!confirm('Удалить аккаунт и все данные без возможности восстановления?')) return
          if (!confirm('Точно удалить? Отменить будет нельзя.')) return
          const { error } = await supabase.rpc('delete_my_account')
          if (error) { setExpMsg('Не удалось удалить: ' + error.message); return }
          try { localStorage.clear() } catch { /* */ }
          await supabase.auth.signOut(); location.href = '/'
        }}>Удалить аккаунт и данные</Button>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>Выйти из аккаунта</Button>
      <p className="text-center text-xs text-green-900/50">Фото и бренды продуктов: Open Food Facts (CC BY-SA)</p>
      <LegalLinks />
    </div>
  )
}
