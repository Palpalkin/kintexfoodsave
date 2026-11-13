import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, ScanLine, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { enqueue, isOffline } from '@/lib/outbox'
import { recognizeReceipt } from '@/lib/ocr'
import { guessExpiry, parseReceipt } from '@/lib/receipt'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Row = { id: string; on: boolean; name: string; quantity: number; unit: string; expires_on: string }

const today = () => new Date().toISOString().slice(0, 10)

export default function Scan() {
  const { space, session } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ p: 0, label: '' })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [raw, setRaw] = useState('')
  const [bought, setBought] = useState(today())
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onFile(file?: File) {
    if (!file) return
    setBusy(true); setErr(null); setRows(null)
    try {
      const text = await recognizeReceipt(file, (p, label) => setProgress({ p, label }))
      setRaw(text)
      const items = parseReceipt(text, new Date(bought))
      setRows(items.map((i) => ({ id: crypto.randomUUID(), on: true, name: i.name, quantity: i.quantity, unit: i.unit, expires_on: i.expires_on ?? '' })))
      if (!items.length) setErr('Не удалось найти позиции. Попробуйте сфотографировать чек ровнее и при хорошем свете, или добавьте продукты вручную.')
    } catch (e) {
      setErr('Ошибка распознавания: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setBusy(false) }
  }

  const patch = (id: string, p: Partial<Row>) => setRows((r) => r && r.map((x) => (x.id === id ? { ...x, ...p } : x)))

  function changeDate(d: string) {
    setBought(d)
    // пересчитываем «угаданные» сроки от новой даты покупки
    setRows((r) => r && r.map((x) => ({ ...x, expires_on: guessExpiry(x.name, new Date(d)) ?? x.expires_on })))
  }

  async function save() {
    if (!space || !session || !rows) return
    const chosen = rows.filter((r) => r.on && r.name.trim())
    if (!chosen.length) return
    setSaving(true)
    const payload = chosen.map((r) => ({
      id: r.id, space_id: space.id, created_by: session.user.id,
      name: r.name.trim().slice(0, 120), quantity: r.quantity || 1, unit: r.unit || 'шт',
      expires_on: r.expires_on || null, location: null,
    }))
    if (isOffline()) payload.forEach((row) => enqueue({ t: 'insert', table: 'products', row }))
    else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { setErr(error.message); setSaving(false); return }
    }
    nav('/')
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ScanLine size={20} />Скан чека</h2>

      {!rows && (
        <Card className="space-y-3">
          <p className="text-sm text-green-900/80">
            Сфотографируйте чек (Магнит, Дикси, Пятёрочка и др.): расправьте его, снимайте при хорошем свете, чтобы был виден весь текст.
            Распознавание идёт на вашем устройстве, фото никуда не отправляется.
          </p>
          <div><Label>Дата покупки</Label><Input type="date" value={bought} max={today()} onChange={(e) => setBought(e.target.value)} /></div>
          {busy ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-green-100"><div className="h-full bg-brand transition-all" style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
              <p className="text-sm text-green-900/70">{progress.label}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild><label><Camera size={16} />Снять<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label></Button>
              <Button asChild variant="outline"><label>Из галереи<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label></Button>
            </div>
          )}
        </Card>
      )}

      {err && <Card className="border-orange-200 bg-orange-50 text-sm text-orange-900">{err}</Card>}

      {rows && (
        <>
          <p className="text-sm text-green-900/70">Проверьте список: исправьте названия, количество и сроки, снимите галочки с лишнего. Сроки подставлены примерно по типу продукта — сверьте с упаковкой.</p>
          <div><Label>Дата покупки</Label><Input type="date" value={bought} max={today()} onChange={(e) => changeDate(e.target.value)} /></div>
          {rows.map((r) => (
            <Card key={r.id} className={`space-y-2 p-3 ${r.on ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={r.on} onChange={(e) => patch(r.id, { on: e.target.checked })} className="h-5 w-5 accent-green-700" />
                <Input value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} />
                <Button variant="ghost" size="icon" onClick={() => setRows((x) => x && x.filter((y) => y.id !== r.id))}><Trash2 size={16} className="text-red-600" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Кол-во</Label><Input type="number" step="any" min="0" value={r.quantity} onChange={(e) => patch(r.id, { quantity: Number(e.target.value) })} /></div>
                <div><Label>Ед.</Label><Input value={r.unit} onChange={(e) => patch(r.id, { unit: e.target.value })} /></div>
                <div><Label>Годен до</Label><Input type="date" value={r.expires_on} onChange={(e) => patch(r.id, { expires_on: e.target.value })} /></div>
              </div>
            </Card>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setRows((x) => (x ?? []).concat({ id: crypto.randomUUID(), on: true, name: '', quantity: 1, unit: 'шт', expires_on: '' }))}><Plus size={16} />Добавить строку</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setRows(null); setErr(null) }}>Заново</Button>
            <Button onClick={save} disabled={saving}>Добавить ({rows.filter((r) => r.on && r.name.trim()).length})</Button>
          </div>
          <details className="text-xs text-green-900/60"><summary>Распознанный текст</summary><pre className="mt-2 whitespace-pre-wrap">{raw}</pre></details>
        </>
      )}
    </div>
  )
}
