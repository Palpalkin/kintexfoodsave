// Свайп карточки: вправо — «использовано», влево — «выброшено». Вертикальная прокрутка не блокируется.
import { useRef, useState, type ReactNode } from 'react'
import { Check, Trash2 } from 'lucide-react'

const LIMIT = 96

export function SwipeRow({ children, onRight, onLeft, className, style }: { children: ReactNode; onRight: () => void; onLeft: () => void; className?: string; style?: React.CSSProperties }) {
  const [dx, setDx] = useState(0)
  const [drag, setDrag] = useState(false)
  const start = useRef<{ x: number; y: number; lock: boolean | null } | null>(null)

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a,input')) return
    start.current = { x: e.clientX, y: e.clientY, lock: null }
  }
  const move = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return
    const mx = e.clientX - s.x, my = e.clientY - s.y
    if (s.lock === null && Math.max(Math.abs(mx), Math.abs(my)) > 8) s.lock = Math.abs(mx) > Math.abs(my)
    if (s.lock) { setDrag(true); setDx(Math.max(-140, Math.min(140, mx))) }
  }
  const end = () => {
    const s = start.current; start.current = null
    setDrag(false)
    if (!s?.lock) { setDx(0); return }
    const fire = dx >= LIMIT ? onRight : dx <= -LIMIT ? onLeft : null
    setDx(0)
    if (fire) { navigator.vibrate?.(15); fire() }
  }

  const p = Math.min(1, Math.abs(dx) / LIMIT)
  return (
    <div style={style} className={`relative overflow-hidden rounded-xl ${className ?? ""}`}>
      <div className={`absolute inset-0 flex items-center px-5 ${dx >= 0 ? 'justify-start bg-green-600' : 'justify-end bg-red-600'}`} aria-hidden>
        {dx > 0 && <Check size={22} className="text-[#ffffff]" style={{ opacity: p, transform: `scale(${0.6 + p * 0.5})` }} />}
        {dx < 0 && <Trash2 size={22} className="text-[#ffffff]" style={{ opacity: p, transform: `scale(${0.6 + p * 0.5})` }} />}
      </div>
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        style={{ transform: `translateX(${dx}px)`, transition: drag ? 'none' : 'transform .25s cubic-bezier(.2,.8,.2,1)', touchAction: 'pan-y' }}
      >{children}</div>
    </div>
  )
}
