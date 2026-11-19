import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'
import { UNITS, unitLabel, computeExpiry, fmt, todayIso, type ExpiryState, type Unit } from '@/lib/expiry'

type Props = { value: ExpiryState; onChange: (v: ExpiryState) => void; hintDays?: number | null }

export function ExpiryField({ value: v, onChange, hintDays }: Props) {
  const t = useT()
  const set = (p: Partial<ExpiryState>) => onChange({ ...v, ...p })
  const result = computeExpiry(v)
  const seg = (active: boolean) => cn('h-9 flex-1 rounded-lg border text-sm font-medium transition-colors',
    active ? 'border-brand bg-brand-solid text-[#ffffff]' : 'border-green-200 bg-white text-green-900')

  return (
    <div className="space-y-2">
      <div>
        <Label>{t('expiryField.produced')}</Label>
        <div className="flex gap-2">
          <Input type="date" value={v.produced} max={todayIso()} onChange={(e) => set({ produced: e.target.value })} />
          <button type="button" className="h-10 shrink-0 rounded-lg border border-green-200 px-3 text-xs" onClick={() => set({ produced: todayIso() })}>{t('expiryField.today')}</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className={seg(v.mode === 'life')} onClick={() => set({ mode: 'life' })}>{t('expiryField.modeLife')}</button>
        <button type="button" className={seg(v.mode === 'until')} onClick={() => set({ mode: 'until' })}>{t('expiryField.modeUntil')}</button>
      </div>
      {hintDays && v.mode === 'life' && !v.amount && (
        <button type="button" onClick={() => set({ amount: String(hintDays), unit: 'days' })} className="fs-pop flex w-full items-center justify-between rounded-lg bg-brand-soft px-3 py-2 text-left text-xs text-green-900">
          <span>{t('expiryField.hint', { n: hintDays })}</span><span className="font-semibold text-brand">{t('expiryField.apply')}</span>
        </button>
      )}
      {v.mode === 'life' && (
        <div className="flex flex-wrap gap-1.5">
          {[3, 7, 14, 30, 90].map((n) => <button key={n} type="button" onClick={() => set({ amount: String(n), unit: 'days' })} className={cn('rounded-full border px-2.5 py-1 text-xs', v.amount === String(n) && v.unit === 'days' ? 'border-brand bg-brand-soft font-medium' : 'border-green-200 bg-white')}>{t('expiryField.qDays', { n })}</button>)}
        </div>
      )}
      {v.mode === 'life' ? (
        <div className="flex gap-2">
          <Input type="number" inputMode="numeric" min={1} placeholder="5" value={v.amount} onChange={(e) => set({ amount: e.target.value })} />
          <select className="h-10 rounded-lg border border-green-200 bg-white px-2" value={v.unit} onChange={(e) => set({ unit: e.target.value as Unit })}>
            {UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
          </select>
        </div>
      ) : (
        <Input type="date" value={v.until} onChange={(e) => set({ until: e.target.value })} />
      )}
      <p className={cn('text-xs', result ? 'font-medium text-green-800' : 'text-green-900/50')}>
        {result ? t('expiryField.result', { date: fmt(result) }) : v.mode === 'life' ? t('expiryField.needLife') : t('expiryField.needUntil')}
      </p>
    </div>
  )
}
