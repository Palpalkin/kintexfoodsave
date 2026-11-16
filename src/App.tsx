import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Apple, ChefHat, Settings as Cog, ShoppingCart, Users } from 'lucide-react'
import { configured, supabase } from '@/lib/supabase'
import { setLang } from '@/lib/i18n'
import { AppProvider, useApp } from '@/lib/session'
import { flush, onOutboxChange, pendingCount } from '@/lib/outbox'
import { daysLeft, cn } from '@/lib/utils'
import { currentSubscription } from '@/lib/push'
import Auth, { NewPassword } from '@/pages/Auth'
import Products from '@/pages/Products'
import Recipes from '@/pages/Recipes'
import Shopping from '@/pages/Shopping'
import Family from '@/pages/Family'
import Settings from '@/pages/Settings'
import Scan from '@/pages/Scan'
import Stats from '@/pages/Stats'
import { LegalPage, LEGAL_PATHS } from '@/pages/Legal'
import { CookieNotice } from '@/components/CookieNotice'
import { Onboarding, onboardingSeen } from '@/components/Onboarding'

const tabs = [
  { to: '/', label: 'Продукты', icon: Apple },
  { to: '/shopping', label: 'Покупки', icon: ShoppingCart },
  { to: '/recipes', label: 'Рецепты', icon: ChefHat },
  { to: '/family', label: 'Семья', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Cog },
]

// Проверка сроков при открытии приложения (без фоновых процессов и опроса БД).
async function notifyExpiring(spaceId: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !navigator.onLine) return
  const today = new Date().toDateString()
  if (localStorage.getItem('fs.notified') === today) return
  if (await currentSubscription().catch(() => null)) return // фоновые push уже включены: не дублируем
  const limit = Number(localStorage.getItem('fs.notifyDays') ?? 3)
  const { data } = await supabase.from('products').select('name,expires_on').eq('space_id', spaceId).eq('status', 'active').not('expires_on', 'is', null).limit(100)
  const soon = (data ?? []).filter((p) => { const d = daysLeft(p.expires_on); return d !== null && d <= limit })
  if (!soon.length) return
  localStorage.setItem('fs.notified', today)
  const reg = await navigator.serviceWorker?.ready
  const body = soon.slice(0, 4).map((p) => p.name).join(', ') + (soon.length > 4 ? '…' : '')
  reg?.showNotification(`Скоро истекает срок: ${soon.length}`, { body, icon: '/icon-192.png' })
}

function Shell() {
  const { session, ready, space, recovery, clearRecovery } = useApp()
  const loc = useLocation()
  const [tour, setTour] = useState(!onboardingSeen())
  useEffect(() => { const f = () => setTour(true); window.addEventListener('fs-tour', f); return () => window.removeEventListener('fs-tour', f) }, [])
  // язык из профиля (если пользователь выбирал его на другом устройстве)
  useEffect(() => {
    if (!session) return
    void supabase.from('user_settings').select('lang').maybeSingle().then(({ data }) => { if (data?.lang === 'ru' || data?.lang === 'en') setLang(data.lang) })
  }, [session?.user.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (space) void notifyExpiring(space.id) }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [pending, setPending] = useState(pendingCount())
  useEffect(() => { void flush() }, [session])
  useEffect(() => {
    const upd = () => setPending(pendingCount())
    const retry = () => void flush()
    window.addEventListener('online', retry); window.addEventListener('focus', retry)
    const off = onOutboxChange(upd)
    return () => { window.removeEventListener('online', retry); window.removeEventListener('focus', retry); off() }
  }, [])

  if (LEGAL_PATHS.includes(loc.pathname)) return <><LegalPage path={loc.pathname} /><CookieNotice /></>
  if (!configured) return <div className="p-6 text-sm">Не настроены переменные окружения <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. См. README.</div>
  if (!ready) return null
  if (!session) return <><Auth /><CookieNotice /></>
  if (recovery) return <NewPassword onDone={clearRecovery} />

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      {pending > 0 && (
        <button onClick={() => void flush()} className="mx-4 mt-3 rounded-lg bg-orange-100 px-3 py-2 text-left text-xs text-orange-900">
          Ожидает отправки: {pending}. {navigator.onLine ? 'Нажмите, чтобы отправить сейчас.' : 'Нет связи: отправится автоматически, когда появится интернет.'}
        </button>
      )}
      <CookieNotice />
      {tour && <Onboarding onClose={() => setTour(false)} />}
      <main key={loc.pathname} className="fs-fade flex-1 p-4 pb-24">
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/family" element={<Family />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-green-100 bg-white/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors', isActive ? 'text-brand font-semibold' : 'text-gray-500')}>
              {({ isActive }: { isActive: boolean }) => <>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-soft')}><I size={20} className={isActive ? 'fs-pop' : ''} /></span>{label}
              </>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return <AppProvider><BrowserRouter><Shell /></BrowserRouter></AppProvider>
}
