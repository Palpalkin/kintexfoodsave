import { supabase } from './supabase'
import { isOffline, run } from './outbox'
import { defaultUnit } from './utils'

export const autoShopEnabled = () => localStorage.getItem('fs.autoShop') !== '0'
export const setAutoShop = (on: boolean) => localStorage.setItem('fs.autoShop', on ? '1' : '0')

/** Добавляет в список покупок, не дублируя уже ожидающие покупки позиции с тем же названием. */
export async function addToShopping(spaceId: string, userId: string, item: { name: string; quantity?: number; unit?: string }): Promise<'added' | 'exists'> {
  const row = { id: crypto.randomUUID(), space_id: spaceId, created_by: userId, name: item.name.trim(), quantity: item.quantity ?? 1, unit: item.unit ?? defaultUnit() }
  if (isOffline()) { await run({ t: 'insert', table: 'shopping_items', row }); return 'added' }
  const { data } = await supabase.from('shopping_items').select('id').eq('space_id', spaceId).eq('checked', false).ilike('name', row.name.replace(/[%_]/g, '\\$&')).limit(1)
  if (data?.length) return 'exists'
  await run({ t: 'insert', table: 'shopping_items', row })
  return 'added'
}
