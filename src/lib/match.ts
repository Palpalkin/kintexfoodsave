// Простое сопоставление ингредиентов рецепта с продуктами по основам слов (без AI и внешних API).
const stems = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 3).map((w) => w.slice(0, 5))

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
