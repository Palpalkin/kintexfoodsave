import { useEffect, useState, type FormEvent } from 'react'
import { Copy, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useApp } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function Family() {
  const t = useT()
  const { spaces, space, setSpaceId, reloadSpaces, session } = useApp()
  const [members, setMembers] = useState(0)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!space) return
    supabase.from('space_members').select('user_id', { count: 'exact', head: true }).eq('space_id', space.id)
      .then(({ count }) => setMembers(count ?? 0))
  }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function join(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    const { data, error } = await supabase.rpc('join_space', { p_code: code })
    if (error) { setMsg(t('family.badCode')); return }
    await reloadSpaces(); setSpaceId(data as string); setCode(''); setMsg(t('family.joined'))
  }

  async function leave() {
    if (!space || !session) return
    if (!confirm(t('family.leaveConfirm', { name: space.name }))) return
    await supabase.from('space_members').delete().eq('space_id', space.id).eq('user_id', session.user.id)
    await reloadSpaces()
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t('family.title')}</h2>
      <Card className="space-y-2">
        <Label>{t('family.current')}</Label>
        <select className="h-10 w-full rounded-lg border border-green-200 bg-white px-3" value={space?.id} onChange={(e) => setSpaceId(e.target.value)}>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {space && (
          <>
            <p className="text-sm text-green-900/70">{t('family.members', { n: members })}</p>
            <Label>{t('family.inviteCode')}</Label>
            <div className="flex gap-2">
              <Input readOnly value={space.invite_code} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => navigator.clipboard?.writeText(space.invite_code)}><Copy size={16} /></Button>
            </div>
            <Button variant="ghost" size="sm" onClick={leave}><LogOut size={14} />{t('family.leave')}</Button>
          </>
        )}
      </Card>
      <Card>
        <form onSubmit={join} className="space-y-2">
          <Label>{t('family.joinByCode')}</Label>
          <div className="flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('family.codePlaceholder')} required /><Button>{t('family.join')}</Button></div>
          {msg && <p className="text-sm text-green-900/80">{msg}</p>}
        </form>
      </Card>
    </div>
  )
}
