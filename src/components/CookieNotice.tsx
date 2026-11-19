// Уведомление о технических данных в браузере. Аналитики и рекламных cookie нет, поэтому это информирование, а не выбор.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

const KEY = 'fs.cookies.v1'
const seen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }

export function CookieNotice() {
  const t = useT()
  const [open, setOpen] = useState(!seen())
  if (!open) return null
  return (
    <div className="fs-toast fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-white p-3 text-xs shadow-xl" role="region" aria-label={t('cookie.aria')}>
      <p className="flex-1">{t('cookie.text')} <Link to="/privacy" className="text-brand underline">{t('cookie.more')}</Link></p>
      <Button size="sm" onClick={() => { try { localStorage.setItem(KEY, '1') } catch { /* */ } setOpen(false) }}>{t('cookie.ok')}</Button>
    </div>
  )
}
