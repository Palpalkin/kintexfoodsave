import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Settings() {
  const { session } = useApp()
  const [days, setDays] = useState(3)
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  useEffect(() => {
    supabase.from('user_settings').select('notify_days_before').maybeSingle().then(({ data }) => data && setDays(data.notify_days_before))
  }, [])

  async function save() {
    if (!session) return
    await supabase.from('user_settings').upsert({ user_id: session.user.id, notify_days_before: days })
    localStorage.setItem('fs.notifyDays', String(days))
  }
  async function enable() { if (typeof Notification !== 'undefined') setPerm(await Notification.requestPermission()) }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Настройки</h2>
      <Card className="space-y-3">
        <div><Label>Напоминать о сроке за (дней)</Label><Input type="number" min={0} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        <Button onClick={save}>Сохранить</Button>
        <div className="border-t border-green-100 pt-3 text-sm">
          <p className="mb-2">Уведомления: <b>{perm === 'granted' ? 'включены' : perm === 'denied' ? 'запрещены в браузере' : perm === 'unsupported' ? 'не поддерживаются' : 'выключены'}</b></p>
          {perm === 'default' && <Button variant="outline" onClick={enable}>Разрешить уведомления</Button>}
          <p className="mt-2 text-xs text-green-900/60">На iPhone уведомления работают после добавления приложения на экран «Домой» (iOS 16.4+).</p>
        </div>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>Выйти из аккаунта</Button>
    </div>
  )
}
