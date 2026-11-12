// Простой кэш последних данных для офлайн-просмотра.
export const cacheGet = <T,>(k: string): T | null => {
  try { return JSON.parse(localStorage.getItem('fs.cache.' + k) ?? 'null') } catch { return null }
}
export const cacheSet = (k: string, v: unknown) => {
  try { localStorage.setItem('fs.cache.' + k, JSON.stringify(v)) } catch { /* квота */ }
}
