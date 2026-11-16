// Переключатель языка RU / EN. Выбор запоминается на устройстве и (если вы вошли) в профиле.
import { supabase } from '@/lib/supabase'
import { LANGS, setLang, useLang, useT, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitch({ userId, compact }: { userId?: string; compact?: boolean }) {
  const lang = useLang(); const t = useT()
  const pick = (l: Lang) => {
    setLang(l)
    if (userId) void supabase.from('user_settings').upsert({ user_id: userId, lang: l }, { onConflict: 'user_id' }).then(() => {})
  }
  return (
    <div role="group" aria-label={t('lang.label')} className={cn('inline-flex rounded-full border border-green-200 bg-white p-0.5 text-xs font-semibold', compact ? '' : 'shadow-sm')}>
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => pick(l)}
          className={cn('rounded-full px-3 py-1 transition-colors', lang === l ? 'bg-brand-solid text-[#ffffff]' : 'text-green-900/70')}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}
