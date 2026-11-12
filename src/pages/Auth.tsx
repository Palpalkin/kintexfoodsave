import { useState, type FormEvent } from 'react'
import { Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null)
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Проверьте почту: отправлена ссылка для подтверждения.')
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white"><Leaf /></div>
        <h1 className="text-2xl font-bold">KINTEXFOODSAVE</h1>
        <p className="text-sm text-green-900/70">Продукты, сроки годности и питание</p>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><Label>Пароль</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <Button className="w-full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </form>
        <button className="mt-3 w-full text-center text-sm text-brand underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      </Card>
    </div>
  )
}
