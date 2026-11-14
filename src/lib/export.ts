// Экспорт данных пространства: CSV продуктов (для Excel) и полная JSON-копия. Работает на клиенте, без серверов.
import { supabase } from './supabase'

const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function toCsv(rows: Record<string, unknown>[], cols: string[]): string {
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n')
}

function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export async function exportData(spaceId: string, kind: 'csv' | 'json'): Promise<string> {
  const [p, r, s] = await Promise.all([
    supabase.from('products').select('name,category,quantity,unit,location,produced_on,expires_on,status,notes').eq('space_id', spaceId).order('name').limit(5000),
    supabase.from('recipes').select('title,ingredients,instructions').eq('space_id', spaceId).limit(1000),
    supabase.from('shopping_items').select('name,quantity,unit,checked').eq('space_id', spaceId).limit(2000),
  ])
  if (p.error) return p.error.message
  const day = new Date().toISOString().slice(0, 10)
  if (kind === 'csv') download(`kintexfoodsave-${day}.csv`, toCsv(p.data ?? [], ['name', 'category', 'quantity', 'unit', 'location', 'produced_on', 'expires_on', 'status', 'notes']), 'text/csv;charset=utf-8')
  else download(`kintexfoodsave-${day}.json`, JSON.stringify({ exported: day, products: p.data, recipes: r.data, shopping: s.data }, null, 2), 'application/json')
  return `Готово: ${p.data?.length ?? 0} продуктов`
}
