// Edge Function: подбор рецептов из продуктов. Ключ AI хранится только в секретах Supabase.
// Смена провайдера: secrets AI_PROVIDER=anthropic|openai, AI_API_KEY, AI_MODEL (необязательно).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Complete = (system: string, user: string) => Promise<string>

const providers: Record<string, (key: string, model?: string) => Complete> = {
  anthropic: (key, model) => async (system, user) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: model ?? 'claude-haiku-5-5', max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!r.ok) throw new Error(`AI ${r.status}`)
    return (await r.json()).content?.[0]?.text ?? ''
  },
  openai: (key, model) => async (system, user) => {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: model ?? 'gpt-4o-mini', max_tokens: 1500, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!r.ok) throw new Error(`AI ${r.status}`)
    return (await r.json()).choices?.[0]?.message?.content ?? ''
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = Deno.env.get('AI_API_KEY')
  const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic'
  if (!key || !providers[provider]) {
    return json({ error: 'AI не настроен: задайте секреты AI_API_KEY и AI_PROVIDER в Supabase.' }, 503)
  }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    db: { schema: 'foodsave' },
  })
  const { data: user } = await sb.auth.getUser()
  if (!user.user) return json({ error: 'Требуется вход' }, 401)

  const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 10)
  const { data: ok } = await sb.rpc('consume_ai_quota', { p_limit: limit })
  if (!ok) return json({ error: `Дневной лимит AI-запросов (${limit}) исчерпан` }, 429)

  const body = await req.json().catch(() => ({}))
  const products = Array.isArray(body.products) ? body.products.slice(0, 25) : []
  if (!products.length) return json({ error: 'Нет продуктов для подбора рецептов' }, 400)

  const system = 'Ты помощник по кулинарии. Предлагай простые рецепты, в первую очередь из продуктов с ближайшим сроком годности. Отвечай ТОЛЬКО валидным JSON без пояснений.'
  const prompt = `Продукты (название, количество, срок годности):\n${products.map((p: { name: string; quantity: number; unit: string; expires_on: string | null }) => `- ${String(p.name).slice(0, 80)}, ${p.quantity} ${p.unit}, до ${p.expires_on ?? 'не указан'}`).join('\n')}\n\nПредложи 3 рецепта на русском. Формат: {"recipes":[{"title":"","ingredients":[{"name":"","amount":""}],"instructions":"шаги через перевод строки"}]}`

  try {
    const text = await providers[provider](key, Deno.env.get('AI_MODEL') ?? undefined)(system, prompt)
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    return json({ recipes: parsed.recipes ?? [] })
  } catch (e) {
    console.error(e)
    return json({ error: 'Не удалось получить ответ от AI' }, 502)
  }
})
