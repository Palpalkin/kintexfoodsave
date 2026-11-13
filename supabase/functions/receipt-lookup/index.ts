// Необязательная загрузка позиций чека по данным QR через сторонний сервис.
// ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНА: без секрета RECEIPT_API_TOKEN отвечает 503 not_configured, и приложение
// распознаёт чек по фото (OCR на устройстве). Ничего платного не вызывается без вашего токена.
// Провайдер: proverkacheka.com (RECEIPT_API_PROVIDER=proverkacheka). Формат ответа сверен по открытым
// описаниям API и не проверен на реальном токене — при первом подключении проверьте на своём чеке.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Item = { name: string; quantity: number; sum: number }

const providers: Record<string, (token: string, qr: string) => Promise<{ items: Item[]; date: string | null }>> = {
  proverkacheka: async (token, qr) => {
    const r = await fetch('https://proverkacheka.com/api/v1/check/get', {
      method: 'POST',
      body: new URLSearchParams({ token, qrraw: qr }),
    })
    if (!r.ok) throw new Error(`provider ${r.status}`)
    const j = await r.json()
    if (j.code !== 1) throw new Error(`provider code ${j.code}`)
    const doc = j.data?.json
    const items: Item[] = (doc?.items ?? []).map((i: { name: string; quantity: number; sum: number }) => ({
      name: String(i.name ?? '').slice(0, 120), quantity: Number(i.quantity ?? 1), sum: Number(i.sum ?? 0) / 100, // копейки → рубли
    }))
    const dt = String(doc?.dateTime ?? '').slice(0, 10)
    return { items, date: /^\d{4}-\d{2}-\d{2}$/.test(dt) ? dt : null }
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = Deno.env.get('RECEIPT_API_TOKEN')
  const provider = Deno.env.get('RECEIPT_API_PROVIDER') ?? 'proverkacheka'
  if (!token || !providers[provider]) return json({ error: 'not_configured' }, 503)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: user } = await sb.auth.getUser()
  if (!user.user) return json({ error: 'unauthorized' }, 401)

  const { qr } = await req.json().catch(() => ({ qr: '' }))
  if (typeof qr !== 'string' || !/fn=\d+/.test(qr) || qr.length > 300) return json({ error: 'bad_qr' }, 400)

  try {
    return json(await providers[provider](token, qr))
  } catch (e) {
    console.error(e)
    return json({ error: 'lookup_failed' }, 502)
  }
})
