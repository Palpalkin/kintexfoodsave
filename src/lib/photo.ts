// Фото и бренд продукта из открытой базы Open Food Facts (бесплатно, без ключа, лицензия CC BY-SA).
// В запрос уходит только название (или штрихкод) продукта. Результат кэшируется, запросы идут по одному и редко.
const KEY = 'fs.img.v1'
const HOST = 'https://images.openfoodfacts.org/'
type Hit = { url: string; brand: string | null } | null
type Cache = Record<string, { url: string; brand: string | null } | 0>

const load = (): Cache => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
const save = (c: Cache) => { try { const k = Object.keys(c); if (k.length > 400) for (const x of k.slice(0, k.length - 400)) delete c[x]; localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* */ } }
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
export const okUrl = (u: unknown): u is string => typeof u === 'string' && u.startsWith(HOST)

let chain: Promise<unknown> = Promise.resolve()
const slot = <T,>(fn: () => Promise<T>): Promise<T> => { const p = chain.then(fn, fn); chain = p.then(() => new Promise((r) => setTimeout(r, 800)), () => new Promise((r) => setTimeout(r, 800))); return p }

async function get(url: string): Promise<unknown> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000)
  try { const r = await fetch(url, { signal: ctl.signal }); return r.ok ? await r.json() : null } catch { return null } finally { clearTimeout(t) }
}

type OffP = { product_name?: string; product_name_ru?: string; brands?: string; image_front_small_url?: string; image_front_url?: string }
const pick = (p: OffP | undefined): Hit => {
  const url = p?.image_front_small_url || p?.image_front_url
  return okUrl(url) ? { url, brand: String(p?.brands ?? '').split(',')[0].trim() || null } : null
}

/** Ищет фото по штрихкоду (точно) или по названию (приблизительно). Возвращает null, если не нашлось или нет сети. */
export async function findPhoto(name: string, barcode?: string | null): Promise<Hit> {
  if (!navigator.onLine) return null
  const key = barcode ? 'bc:' + barcode : norm(name)
  if (key.length < 3) return null
  const cache = load()
  if (key in cache) return cache[key] || null
  const hit = await slot(async () => {
    if (barcode) {
      const j = await get(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_front_small_url,image_front_url`) as { product?: OffP } | null
      const h = pick(j?.product); if (h) return h
    }
    const q = encodeURIComponent(norm(name))
    const j = await get(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=8&lc=ru&cc=ru&fields=product_name,product_name_ru,brands,image_front_small_url,image_front_url`) as { products?: OffP[] } | null
    if (!j) return undefined // сбой сети — не кэшируем «ничего не нашли»
    const words = norm(name).split(' ').filter((w) => w.length >= 3).map((w) => w.slice(0, 4))
    const list = j.products ?? []
    const good = list.find((p) => pick(p) && words.every((w) => norm((p.product_name_ru || p.product_name || '')).includes(w))) ?? list.find((p) => pick(p))
    return pick(good) ?? null
  })
  if (hit === undefined) return null
  cache[key] = hit ?? 0; save(cache)
  return hit
}
