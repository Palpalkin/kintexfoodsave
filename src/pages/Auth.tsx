import { useState, type FormEvent } from 'react'
import { useT, getLang } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { LEGAL } from '@/lib/legal'
import { LegalLinks } from '@/pages/Legal'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function NewPassword({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  async function save(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setMsg(error.message); else onDone()
  }
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center p-4">
      <Card>
        <form onSubmit={save} className="space-y-3">
          <h2 className="font-semibold">{t('auth.newPassword')}</h2>
          <Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <Button className="w-full">{t('auth.save')}</Button>
        </form>
      </Card>
    </div>
  )
}

export default function Auth() {
  const t = useT()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (mode === 'up' && !agree) { setMsg(t('auth.needConsent')); return }
    setBusy(true)
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { consent_pd_version: LEGAL.version, consent_pd_at: new Date().toISOString(), terms_version: LEGAL.version } } })
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg(t('auth.checkMail'))
    setBusy(false)
  }

  async function forgot() {
    if (!email) { setMsg(t('auth.enterEmail')); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMsg(error ? error.message : t('auth.resetSent'))
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-4">
      <div className="flex justify-end"><LanguageSwitch compact /></div>
      <div className="text-center">
        <img src="/logo-hero.webp" alt="KINTEX FOOD SAVE" className="mx-auto h-auto w-full max-w-[320px]" />
        <p className="mt-2 text-sm text-green-900/70">{t('auth.tagline')}</p>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>{t('auth.email')}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><Label>{t('auth.password')}</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
          {mode === 'up' && (
            <label className="flex items-start gap-2 text-xs leading-snug">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-700" />
              <span>{t('auth.consent1')}{getLang() === 'ru' && <a href="/consent" target="_blank" rel="noopener" className="text-brand underline">{t('auth.consentLink1')}</a>}{t('auth.consent2')}<a href="/privacy" target="_blank" rel="noopener" className="text-brand underline">{t('auth.consentLink2')}</a>{t('auth.consent3')}<a href="/terms" target="_blank" rel="noopener" className="text-brand underline">{t('auth.consentLink3')}</a>{t('auth.consent4')}</span>
            </label>
          )}
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <Button className="w-full" disabled={busy}>{mode === 'in' ? t('auth.signIn') : t('auth.signUp')}</Button>
        </form>
        {mode === 'in' && <button type="button" className="mt-3 w-full text-center text-sm text-brand underline" onClick={forgot}>{t('auth.forgot')}</button>}
        <button className="mt-2 w-full text-center text-sm text-brand underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? t('auth.toSignUp') : t('auth.toSignIn')}
        </button>
      </Card>
      <LegalLinks />
    </div>
  )
}
