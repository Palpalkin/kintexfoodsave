// Простое сопоставление ингредиентов рецепта с продуктами по основам слов (без AI и внешних API).
// Английские множественные числа: eggs → egg, tomatoes → tomato, berries → berry.
const sing = (w: string) => !/^[a-z]+$/.test(w) ? w
  : w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.length > 4 && w.endsWith('oes') ? w.slice(0, -2)
  : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w
const stems = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 3).map((w) => sing(w).slice(0, 5))

/** Все основы слов ингредиента должны встретиться в названии продукта («соевый соус» не совпадёт с «томатный соус»). */
export function matchesAll(ingredient: string, productName: string): boolean {
  const a = stems(ingredient), b = new Set(stems(productName))
  return a.length > 0 && a.every((x) => b.has(x))
}

export function matches(ingredient: string, productName: string): boolean {
  const a = stems(ingredient), b = new Set(stems(productName))
  return a.some((x) => b.has(x))
}

/** «молоко - 200 мл», «Яйца: 2 шт», «мука — 300 г» → { name, amount } */
export function parseIngredients(text: string): { name: string; amount?: string }[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 40).map((l) => {
    const m = l.match(/^(.+?)\s*(?:[-–—:]|\s{2,})\s*(.+)$/)
    return m ? { name: m[1].trim(), amount: m[2].trim() } : { name: l }
  })
}
