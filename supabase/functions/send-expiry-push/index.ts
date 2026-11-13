// Web Push о сроках годности. Вызывается: (1) по расписанию pg_cron раз в сутки (action=cron, секрет в заголовке),
// (2) приложением: action=public-key (ключ для подписки) и action=test (пробное уведомление). Без собственного сервера.
// Ключи VAPID создаются при первом обращении и хранятся в закрытой таблице public.push_config (доступ только service_role).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const URL_ = Deno.env.get('SUPABASE_URL')!
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://kintexfoodsave.pages.dev'
const TZ_HOURS = Number(Deno.env.get('TZ_OFFSET_HOURS') ?? 3) // Москва

type Cfg = { vapid: { publicKey: string; privateKey: string }; cron: string }

async function config(): Promise<Cfg> {
  const read = async () => {
    const { data } = await admin.from('push_config').select('key,value').in('key', ['vapid', 'cron_secret'])
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value as string]))
  }
  let m = await read()
  if (!m.vapid) {
    // ignoreDuplicates: при гонке двух вызовов остаётся одна пара ключей
    await admin.from('push_config').upsert({ key: 'vapid', value: JSON.stringify(webpush.generateVAPIDKeys()) }, { onConflict: 'key', ignoreDuplicates: true })
    m = await read()
  }
  return { vapid: JSON.parse(m.vapid), cron: m.cron_secret }
}

type Sub = { endpoint: string; user_id: string; keys: { p256dh: string; auth: string } }
type Payload = { title: string; body: string; url?: string }

async function send(cfg: Cfg, sub: Sub, payload: Payload): Promise<'ok' | 'gone' | 'error'> {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), {
      vapidDetails: { subject: SUBJECT, publicKey: cfg.vapid.publicKey, privateKey: cfg.vapid.privateKey },
      TTL: 60 * 60 * 12,
    })
    return 'ok'
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode
    if (code === 404 || code === 410) {
      await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      return 'gone'
    }
    console.error('push error', code, (e as Error).message)
    return 'error'
  }
}

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

async function digest(cfg: Cfg) {
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint,user_id,keys')
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  const today = new Date(Date.now() + TZ_HOURS * 3600e3).toISOString().slice(0, 10)
  let sent = 0, removed = 0
  for (const [uid, list] of byUser) {
    const { data: st } = await admin.from('user_settings').select('notify_days_before').eq('user_id', uid).maybeSingle()
    const { data: mem } = await admin.from('space_members').select('space_id').eq('user_id', uid)
    const ids = (mem ?? []).map((m) => m.space_id)
    if (!ids.length) continue
    const { data: prods } = await admin.from('products').select('name,expires_on')
      .in('space_id', ids).eq('status', 'active').not('expires_on', 'is', null)
      .lte('expires_on', addDays(today, st?.notify_days_before ?? 3)).order('expires_on').limit(30)
    if (!prods?.length) continue
    const expired = prods.filter((p) => p.expires_on < today).length
    const soon = prods.length - expired
    const title = expired && soon ? `Просрочено: ${expired}, скоро истекает: ${soon}` : expired ? `Просрочено продуктов: ${expired}` : `Скоро истекает срок: ${soon}`
    const names = prods.slice(0, 4).map((p) => p.name).join(', ') + (prods.length > 4 ? '…' : '')
    for (const s of list) {
      const r = await send(cfg, s, { title, body: names, url: '/' })
      if (r === 'ok') sent++; else if (r === 'gone') removed++
    }
  }
  return { users: byUser.size, sent, removed }
}

async function caller(req: Request) {
  const sb = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data } = await sb.auth.getUser()
  return data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { action } = await req.json().catch(() => ({ action: '' }))
  const cfg = await config()

  if (action === 'cron') {
    const given = req.headers.get('x-cron-secret') ?? ''
    if (!cfg.cron || given !== cfg.cron) return json({ error: 'forbidden' }, 403)
    return json(await digest(cfg))
  }

  const user = await caller(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  if (action === 'public-key') return json({ publicKey: cfg.vapid.publicKey })

  if (action === 'test') {
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint,user_id,keys').eq('user_id', user.id)
    if (!subs?.length) return json({ error: 'Нет подписки на этом устройстве' }, 404)
    let ok = 0
    for (const s of subs as Sub[]) if ((await send(cfg, s, { title: 'KINTEXFOODSAVE', body: 'Уведомления работают', url: '/' })) === 'ok') ok++
    return json({ sent: ok })
  }
  return json({ error: 'bad_action' }, 400)
})
