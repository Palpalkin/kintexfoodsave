import { supabase } from './supabase'
import { cacheGet, cacheSet } from './cache'

export type Fav = { name_key: string; name: string; unit: string }
export const favKey = (name: string) => name.trim().toLowerCase().replace(/ё/g, 'е')

export async function loadFavs(spaceId: string): Promise<Fav[]> {
  const key = 'favs.' + spaceId
  if (!navigator.onLine) return cacheGet<Fav[]>(key) ?? []
  const { data } = await supabase.from('favorites').select('name_key,name,unit').eq('space_id', spaceId).order('name').limit(200)
  if (data) { cacheSet(key, data); return data as Fav[] }
  return cacheGet<Fav[]>(key) ?? []
}

export async function toggleFav(spaceId: string, userId: string, name: string, unit: string, on: boolean): Promise<string | null> {
  const k = favKey(name)
  const { error } = on
    ? await supabase.from('favorites').upsert({ space_id: spaceId, name_key: k, name: name.trim(), unit, created_by: userId }, { onConflict: 'space_id,name_key', ignoreDuplicates: true })
    : await supabase.from('favorites').delete().eq('space_id', spaceId).eq('name_key', k)
  return error?.message ?? null
}
