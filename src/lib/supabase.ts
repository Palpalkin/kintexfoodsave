import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const configured = Boolean(url && key)

// Все данные приложения живут в отдельной схеме foodsave (см. supabase/migrations).
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  db: { schema: 'foodsave' },
  auth: { persistSession: true, autoRefreshToken: true },
})
