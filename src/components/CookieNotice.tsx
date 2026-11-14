// Уведомление о технических данных в браузере. Аналитики и рекламных cookie нет, поэтому это информирование, а не выбор.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const KEY = 'fs.cookies.v1'
const seen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }

export function CookieNotice() {
  const [open, setOpen] = useState(!seen())
  if (!open) return null
  return (
    <div className="fs-toast fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-white p-3 text-xs shadow-xl" role="region" aria-label="Уведомление о cookie">
      <p className="flex-1">Мы используем только технические cookie и локальное хранилище (вход, кэш, работа офлайн). Без рекламы и аналитики. <Link to="/privacy" className="text-brand underline">Подробнее</Link></p>
      <Button size="sm" onClick={() => { try { localStorage.setItem(KEY, '1') } catch { /* */ } setOpen(false) }}>Понятно</Button>
    </div>
  )
}
