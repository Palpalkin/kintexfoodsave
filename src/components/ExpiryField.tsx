import { cn } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'
import { UNIT_LABEL, computeExpiry, fmt, todayIso, type ExpiryState, type Unit } from '@/lib/expiry'

type Props = { value: ExpiryState; onChange: (v: ExpiryState) => void }

export function ExpiryField({ value: v, onChange }: Props) {
  const set = (p: Partial<ExpiryState>) => onChange({ ...v, ...p })
  const result = computeExpiry(v)
  const seg = (active: boolean) => cn('h-9 flex-1 rounded-lg border text-sm font-medium transition-colors',
    active ? 'border-brand bg-brand-solid text-[#ffffff]' : 'border-green-200 bg-white text-green-900')

  return (
    <div className="space-y-2">
      <div>
        <Label>Дата производства</Label>
        <div className="flex gap-2">
          <Input type="date" value={v.produced} max={todayIso()} onChange={(e) => set({ produced: e.target.value })} />
          <button type="button" className="h-10 shrink-0 rounded-lg border border-green-200 px-3 text-xs" onClick={() => set({ produced: todayIso() })}>сегодня</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className={seg(v.mode === 'life')} onClick={() => set({ mode: 'life' })}>Годен N дней</button>
        <button type="button" className={seg(v.mode === 'until')} onClick={() => set({ mode: 'until' })}>Годен до даты</button>
      </div>
      {v.mode === 'life' ? (
        <div className="flex gap-2">
          <Input type="number" inputMode="numeric" min={1} placeholder="5" value={v.amount} onChange={(e) => set({ amount: e.target.value })} />
          <select className="h-10 rounded-lg border border-green-200 bg-white px-2" value={v.unit} onChange={(e) => set({ unit: e.target.value as Unit })}>
            {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </div>
      ) : (
        <Input type="date" value={v.until} onChange={(e) => set({ until: e.target.value })} />
      )}
      <p className={cn('text-xs', result ? 'font-medium text-green-800' : 'text-green-900/50')}>
        {result ? `Годен до ${fmt(result)}` : v.mode === 'life' ? 'Укажите дату производства и срок: дату «годен до» посчитаю сама' : 'Укажите дату «годен до»'}
      </p>
    </div>
  )
}
