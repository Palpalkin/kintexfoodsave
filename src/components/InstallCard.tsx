// Установка на главный экран: на Android — системная кнопка, на iPhone — подсказка (push на iOS работают только из установленного приложения).
import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function InstallCard() {
  const [bip, setBip] = useState<BIP | null>(null)
  const [installed, setInstalled] = useState(standalone())
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setBip(e as BIP) }
    const done = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done) }
  }, [])

  if (installed) return null
  if (bip) {
    return (
      <Card className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft"><Download size={22} className="text-brand" /></span>
        <div className="min-w-0 flex-1"><div className="font-semibold">Установить приложение</div><div className="text-xs text-green-900/60">Значок на экране, работа офлайн, напоминания</div></div>
        <Button size="sm" onClick={async () => { await bip.prompt(); const c = await bip.userChoice; if (c.outcome === 'accepted') setInstalled(true); setBip(null) }}>Установить</Button>
      </Card>
    )
  }
  if (isIos()) {
    return (
      <Card className="space-y-1.5">
        <div className="flex items-center gap-2 font-semibold"><Share size={18} className="text-brand" />Установите на iPhone</div>
        <p className="text-xs leading-relaxed text-green-900/80">В Safari нажмите «Поделиться» <Share size={12} className="inline" /> и выберите «На экран “Домой”». Только так на iPhone работают уведомления о сроках.</p>
      </Card>
    )
  }
  return null
}
