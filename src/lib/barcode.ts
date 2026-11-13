// Название товара по штрихкоду: 1) свои прошлые продукты пространства, 2) открытая база Open Food Facts (без ключа).
// Если нигде не найдено — пользователь вводит название сам, и оно запоминается вместе со штрихкодом.
import { supabase } from './supabase'

export const cleanCode = (s: string) => s.replace(/\D/g, '')
export const validCode = (s: string) => /^(\d{8}|\d{12,14})$/.test(s)

export type Found = { name: string; source: 'history' | 'openfoodfacts' }

export async function lookupBarcode(code: string, spaceId: string): Promise<Found | null> {
  const cacheKey = 'fs.bc.' + code
  try { const c = localStorage.getItem(cacheKey); if (c) return { name: c, source: 'history' } } catch { /* */ }

  if (navigator.onLine) {
    const { data } = await supabase.from('products').select('name').eq('space_id', spaceId).eq('barcode', code)
      .order('created_at', { ascending: false }).limit(1)
    if (data?.[0]?.name) return { name: data[0].name, source: 'history' }

    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000)
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_ru,brands`, { signal: ctl.signal })
      clearTimeout(t)
      if (r.ok) {
        const j = await r.json()
        const p = j?.product
        let name: string = (p?.product_name_ru || p?.product_name || '').trim()
        const brand: string = String(p?.brands ?? '').split(',')[0].trim()
        if (name && brand && !name.toLowerCase().includes(brand.toLowerCase())) name = `${name} ${brand}`
        if (name) { try { localStorage.setItem(cacheKey, name) } catch { /* */ } return { name, source: 'openfoodfacts' } }
      }
    } catch { /* нет сети или сервис недоступен — вводим вручную */ }
  }
  return null
}
