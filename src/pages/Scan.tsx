import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, ScanLine, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/session'
import { enqueue, isOffline } from '@/lib/outbox'
import { recognizeReceipt } from '@/lib/ocr'
import { parseReceipt } from '@/lib/receipt'
import { ExpiryField } from '@/components/ExpiryField'
import { emptyExpiry, expiryFields, type ExpiryState } from '@/lib/expiry'
import { readReceiptQr, type FiscalQr } from '@/lib/qr'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Row = { id: string; on: boolean; name: string; quantity: number; unit: string; exp: ExpiryState; sum: number | null }

export default function Scan() {
  const { space, session } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ p: 0, label: '' })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [qr, setQr] = useState<FiscalQr | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function onFile(file?: File) {
    if (!file) return
    setBusy(true); setErr(null); setRows(null); setQr(null); setNote(null)
    try {
      // 1) QR чека: точная дата покупки и сумма (быстро, на устройстве)
      setProgress({ p: 0.03, label: 'Ищу QR-код…' })
      const code = await readReceiptQr(file).catch(() => null)
      if (code) setQr(code)

      // 2) Позиции по QR через сервис (работает только если подключён токен), иначе OCR по фото
      let items: { name: string; quantity: number; unit: string; expires_on: string | null; sum: number | null }[] = []
      if (code && !isOffline()) {
        setProgress({ p: 0.08, label: 'Запрашиваю состав чека…' })
        const { data, error } = await supabase.functions.invoke('receipt-lookup', { body: { qr: code.raw } })
        if (!error && data?.items?.length) {
          items = data.items.map((i: { name: string; quantity: number; sum: number }) => ({
            name: i.name, quantity: i.quantity, unit: Number.isInteger(i.quantity) ? 'шт' : 'кг',
            expires_on: null, sum: i.sum,
          }))
          setNote('Состав чека получен по QR-коду.')
        }
      }
      if (!items.length) {
        const text = await recognizeReceipt(file, (p, label) => setProgress({ p, label }))
        setRaw(text)
        items = parseReceipt(text).map((i) => ({ ...i }))
      }
      setRows(items.map((i) => ({ id: crypto.randomUUID(), on: true, name: i.name, quantity: i.quantity, unit: i.unit, exp: emptyExpiry(), sum: i.sum })))
      if (!items.length) setErr(code
        ? 'QR прочитан (дата и сумма), но товары найти не удалось: сфотографируйте чек целиком, ровно и при хорошем свете, либо добавьте продукты вручную.'
        : 'Не удалось найти позиции. Попробуйте сфотографировать чек ровнее и при хорошем свете, или добавьте продукты вручную.')
    } catch (e) {
      setErr('Ошибка распознавания: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setBusy(false) }
  }

  // Сверка с суммой из QR: помогает заметить пропущенные при распознавании позиции
  const check = (() => {
    if (!qr?.sum || !rows) return null
    const known = rows.filter((r) => r.on && r.sum !== null)
    if (!known.length) return null
    const total = Math.round(known.reduce((a, r) => a + (r.sum ?? 0), 0) * 100) / 100
    const diff = Math.round((qr.sum - total) * 100) / 100
    return { total, diff, ok: Math.abs(diff) < 0.05 }
  })()

  const patch = (id: string, p: Partial<Row>) => setRows((r) => r && r.map((x) => (x.id === id ? { ...x, ...p } : x)))

  async function save() {
    if (!space || !session || !rows) return
    const chosen = rows.filter((r) => r.on && r.name.trim())
    if (!chosen.length) return
    setSaving(true)
    const payload = chosen.map((r) => ({
      id: r.id, space_id: space.id, created_by: session.user.id,
      name: r.name.trim().slice(0, 120), quantity: r.quantity || 1, unit: r.unit || 'шт',
      ...expiryFields(r.exp), location: null, price: r.sum,
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
            Сфотографируйте весь чек вместе с QR-кодом (Магнит, Дикси, Пятёрочка и др.): расправьте его и снимайте при хорошем свете. QR нужен для проверки суммы чека.
            Распознавание идёт на вашем устройстве, фото никуда не отправляется.
          </p>
          {busy ? (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-green-100"><div className="h-full bg-brand-solid transition-all" style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
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

      {qr && (
        <Card className="border-green-200 bg-green-50 text-sm text-green-900">
          QR-код прочитан{qr.date ? `: чек от ${qr.date.split('-').reverse().join('.')}` : ''}{qr.sum ? `, сумма ${qr.sum.toFixed(2).replace('.', ',')} ₽` : ''}.
          {note && <> {note}</>}
          {check && (check.ok
            ? <> Сумма позиций сходится ✓</>
            : <span className="text-orange-800"> Сумма распознанных позиций {check.total.toFixed(2).replace('.', ',')} ₽, не хватает {check.diff.toFixed(2).replace('.', ',')} ₽: возможно, часть товаров не распознана, проверьте список.</span>)}
        </Card>
      )}

      {err && <Card className="border-orange-200 bg-orange-50 text-sm text-orange-900">{err}</Card>}

      {rows && (
        <>
          <p className="text-sm text-green-900/70">Проверьте список: исправьте названия и количество, снимите галочки с лишнего. Для каждого продукта укажите дату производства и либо «годен N дней» (дату «годен до» посчитаю сама), либо «годен до даты».</p>
          {rows.map((r) => (
            <Card key={r.id} className={`space-y-2 p-3 ${r.on ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={r.on} onChange={(e) => patch(r.id, { on: e.target.checked })} className="h-5 w-5 accent-green-700" />
                <Input value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} />
                <Button variant="ghost" size="icon" onClick={() => setRows((x) => x && x.filter((y) => y.id !== r.id))}><Trash2 size={16} className="text-red-600" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Кол-во</Label><Input type="number" step="any" min="0" value={r.quantity} onChange={(e) => patch(r.id, { quantity: Number(e.target.value) })} /></div>
                <div><Label>Ед.</Label><Input value={r.unit} onChange={(e) => patch(r.id, { unit: e.target.value })} /></div>
              </div>
              <ExpiryField value={r.exp} onChange={(exp) => patch(r.id, { exp })} />
            </Card>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setRows((x) => (x ?? []).concat({ id: crypto.randomUUID(), on: true, name: '', quantity: 1, unit: 'шт', exp: emptyExpiry(), sum: null }))}><Plus size={16} />Добавить строку</Button>
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
