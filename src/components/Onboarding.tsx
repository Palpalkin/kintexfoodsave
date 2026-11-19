// Приветствие при первом запуске: 4 коротких шага. Состояние «показано» хранится в localStorage (только удобство).
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

const KEY = 'fs.onboarded.v1'
export const onboardingSeen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }
export const markOnboarded = () => { try { localStorage.setItem(KEY, '1') } catch { /* */ } }
export const resetOnboarding = () => { try { localStorage.removeItem(KEY) } catch { /* */ } }

const ICONS = ['🥗', '🧾', '📅', '👆']

export function Onboarding({ onClose }: { onClose: () => void }) {
  const t = useT()
  const STEPS = ICONS.map((icon, k) => ({ icon, title: t(`onboarding.${k + 1}.title`), text: t(`onboarding.${k + 1}.text`) }))
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
          {!last && <Button variant="ghost" className="flex-1" onClick={done}>{t('onboarding.skip')}</Button>}
          <Button className="flex-1" onClick={() => (last ? done() : setI(i + 1))}>{last ? t('onboarding.start') : t('onboarding.next')}</Button>
        </div>
      </div>
    </div>
  )
}
