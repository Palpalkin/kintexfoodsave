import { useEffect, useState } from 'react'
import { Check, Copy, LayoutGrid } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { createWidgetToken, hasWidgetToken, revokeWidgetToken, scriptableSource } from '@/lib/widget'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function WidgetCard() {
  const t = useT()
  const [on, setOn] = useState(false)
  const [script, setScript] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => { void hasWidgetToken().then(setOn) }, [])

  async function create() {
    setMsg(null)
    const tok = await createWidgetToken()
    const url = import.meta.env.VITE_SUPABASE_URL as string, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
    if (!tok) { setMsg(t('widget.err')); return }
    setScript(scriptableSource(url, key, tok)); setOn(true); setCopied(false)
  }
  async function off() { await revokeWidgetToken(); setOn(false); setScript(null) }
  async function copy() {
    if (!script) return
    try { await navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { setMsg(script) }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 font-medium"><LayoutGrid size={18} className="text-brand" />{t('widget.title')}</div>
      <p className="text-xs text-green-900/70">{t('widget.intro')}</p>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-green-900/80">
        {['s1', 's2', 's3', 's4'].map((k) => <li key={k}>{t('widget.' + k)}</li>)}
      </ol>
      {script && <Button className="w-full" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t('widget.copied') : t('widget.copy')}</Button>}
      {on && !script && <p className="text-xs text-green-800">{t('widget.active')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={on ? 'outline' : 'default'} onClick={create}>{on ? t('widget.regen') : t('widget.create')}</Button>
        {on && <Button size="sm" variant="outline" onClick={off}>{t('widget.revoke')}</Button>}
      </div>
      {msg && <textarea readOnly value={msg} rows={4} className="w-full rounded-lg border border-green-200 p-2 text-xs" onFocus={(e) => e.currentTarget.select()} />}
      <p className="text-[11px] text-green-900/60">{t('widget.privacy')}</p>
      <p className="text-[11px] text-green-900/60">{t('widget.badge')}</p>
    </Card>
  )
}
