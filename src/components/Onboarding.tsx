// Приветствие при первом запуске: 4 коротких шага. Состояние «показано» хранится в localStorage (только удобство).
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const KEY = 'fs.onboarded.v1'
export const onboardingSeen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }
export const markOnboarded = () => { try { localStorage.setItem(KEY, '1') } catch { /* */ } }
export const resetOnboarding = () => { try { localStorage.removeItem(KEY) } catch { /* */ } }

const STEPS = [
  { icon: '🥗', title: 'Добро пожаловать!', text: 'KINTEXFOODSAVE следит за сроками годности, чтобы продукты не пропадали, а деньги не уходили в мусор.' },
  { icon: '🧾', title: 'Сканируйте чеки', text: 'Сфотографируйте чек: приложение прочитает QR-код и список покупок. Останется указать срок годности каждого продукта.' },
  { icon: '📅', title: 'Срок — как вам удобно', text: 'Введите «годен до» или дату производства и «годен 5 дней»: дату окончания посчитаем сами.' },
  { icon: '👆', title: 'Свайпы и уведомления', text: 'Свайп вправо — использовано, влево — выброшено. В «Настройках» включите напоминания, они придут даже при закрытом приложении.' },
]

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const s = STEPS[i]; const last = i === STEPS.length - 1
  const done = () => { markOnboarded(); onClose() }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="fs-toast w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div key={i} className="fs-pop text-6xl" aria-hidden>{s.icon}</div>
        <h2 key={'t' + i} className="fs-fade text-xl font-bold">{s.title}</h2>
        <p key={'p' + i} className="fs-fade text-sm leading-relaxed text-green-900/80">{s.text}</p>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-brand-solid' : 'w-1.5 bg-green-200'}`} />)}
        </div>
        <div className="flex gap-2">
          {!last && <Button variant="ghost" className="flex-1" onClick={done}>Пропустить</Button>}
          <Button className="flex-1" onClick={() => (last ? done() : setI(i + 1))}>{last ? 'Начать' : 'Далее'}</Button>
        </div>
      </div>
    </div>
  )
}
