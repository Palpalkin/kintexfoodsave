import { useEffect } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Apple, ChefHat, Settings as Cog, Users } from 'lucide-react'
import { configured, supabase } from '@/lib/supabase'
import { AppProvider, useApp } from '@/lib/session'
import { flush } from '@/lib/outbox'
import { daysLeft, cn } from '@/lib/utils'
import Auth, { NewPassword } from '@/pages/Auth'
import Products from '@/pages/Products'
import Recipes from '@/pages/Recipes'
import Family from '@/pages/Family'
import Settings from '@/pages/Settings'
import Scan from '@/pages/Scan'

const tabs = [
  { to: '/', label: 'Продукты', icon: Apple },
  { to: '/recipes', label: 'Рецепты', icon: ChefHat },
  { to: '/family', label: 'Семья', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Cog },
]

// Проверка сроков при открытии приложения (без фоновых процессов и опроса БД).
async function notifyExpiring(spaceId: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !navigator.onLine) return
  const today = new Date().toDateString()
  if (localStorage.getItem('fs.notified') === today) return
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
  useEffect(() => { if (space) void notifyExpiring(space.id) }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void flush() }, [session])

  if (!configured) return <div className="p-6 text-sm">Не настроены переменные окружения <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. См. README.</div>
  if (!ready) return null
  if (!session) return <Auth />
  if (recovery) return <NewPassword onDone={clearRecovery} />

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <main className="flex-1 p-4 pb-24">
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/family" element={<Family />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-green-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-xs', isActive ? 'text-brand font-semibold' : 'text-gray-500')}>
              <I size={20} />{label}
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
