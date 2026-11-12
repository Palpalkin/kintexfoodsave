import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { cacheGet, cacheSet } from './cache'
import type { Space } from './types'

type Ctx = {
  session: Session | null
  recovery: boolean
  clearRecovery: () => void
  ready: boolean
  spaces: Space[]
  space: Space | null
  setSpaceId: (id: string) => void
  reloadSpaces: () => Promise<void>
}
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [spaces, setSpaces] = useState<Space[]>(cacheGet<Space[]>('spaces') ?? [])
  const [spaceId, setSpaceIdState] = useState<string | null>(localStorage.getItem('fs.space'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const reloadSpaces = useCallback(async () => {
    if (!session || !navigator.onLine) return
    let { data } = await supabase.from('spaces').select('id,name,invite_code,owner_id').order('created_at')
    if (data && data.length === 0) {
      // Первый вход: создаём личное пространство.
      await supabase.from('spaces').insert({ name: 'Мой дом' })
      ;({ data } = await supabase.from('spaces').select('id,name,invite_code,owner_id').order('created_at'))
    }
    if (data) { setSpaces(data); cacheSet('spaces', data) }
  }, [session])

  useEffect(() => { void reloadSpaces() }, [reloadSpaces])

  const space = spaces.find((s) => s.id === spaceId) ?? spaces[0] ?? null
  const setSpaceId = (id: string) => { localStorage.setItem('fs.space', id); setSpaceIdState(id) }

  return <C.Provider value={{ session, recovery, clearRecovery: () => setRecovery(false), ready, spaces, space, setSpaceId, reloadSpaces }}>{children}</C.Provider>
}
