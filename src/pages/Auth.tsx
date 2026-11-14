import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { LEGAL } from '@/lib/legal'
import { LegalLinks } from '@/pages/Legal'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function NewPassword({ onDone }: { onDone: () => void }) {
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
          <h2 className="font-semibold">Новый пароль</h2>
          <Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <Button className="w-full">Сохранить</Button>
        </form>
      </Card>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (mode === 'up' && !agree) { setMsg('Для регистрации нужно дать согласие на обработку персональных данных.'); return }
    setBusy(true)
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { consent_pd_version: LEGAL.version, consent_pd_at: new Date().toISOString(), terms_version: LEGAL.version } } })
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Проверьте почту: отправлена ссылка для подтверждения.')
    setBusy(false)
  }

  async function forgot() {
    if (!email) { setMsg('Введите email, затем нажмите «Забыли пароль?»'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMsg(error ? error.message : 'Ссылка для сброса пароля отправлена на почту.')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <img src="/logo-hero.webp" alt="KINTEX FOOD SAVE" className="mx-auto h-auto w-full max-w-[320px]" />
        <p className="mt-2 text-sm text-green-900/70">Умная система управления продуктами, сроками годности и питанием</p>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><Label>Пароль</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
          {mode === 'up' && (
            <label className="flex items-start gap-2 text-xs leading-snug">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-700" />
              <span>Я даю <a href="/consent" target="_blank" rel="noopener" className="text-brand underline">согласие на обработку персональных данных</a> (в том числе трансграничную передачу), ознакомлен с <a href="/privacy" target="_blank" rel="noopener" className="text-brand underline">Политикой</a> и принимаю <a href="/terms" target="_blank" rel="noopener" className="text-brand underline">Пользовательское соглашение</a>.</span>
            </label>
          )}
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <Button className="w-full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </form>
        {mode === 'in' && <button type="button" className="mt-3 w-full text-center text-sm text-brand underline" onClick={forgot}>Забыли пароль?</button>}
        <button className="mt-2 w-full text-center text-sm text-brand underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      </Card>
      <LegalLinks />
    </div>
  )
}
