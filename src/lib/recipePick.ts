import { BOOK, STAPLES, type BookRecipe } from './recipeBook'
import { STAPLES_EN } from './recipeBookEn'
import { matches, matchesAll } from './match'
import { daysLeft } from './utils'

export type Stock = { name: string; expires_on: string | null }
export type Pick = { r: BookRecipe; have: string[]; missing: string[]; saves: { name: string; d: number }[]; coverage: number; score: number }

const isStaple = (n: string) => STAPLES.some((s) => n.toLowerCase() === s) || STAPLES_EN.includes(n.toLowerCase())
const alts = (n: string) => n.split('|').map((x) => x.trim())

/** Что можно приготовить из продуктов в наличии. Приоритет: больше совпадений и спасение скоро портящегося. */
export function pickRecipes(stock: Stock[], likes: string[] = [], book: BookRecipe[] = BOOK): Pick[] {
  return book.map((r) => {
    const have: string[] = [], missing: string[] = [], saves: Pick['saves'] = []
    for (const ing of r.ing) {
      const label = alts(ing.name)[0]
      if (isStaple(label)) continue
      const hit = stock.find((s) => alts(ing.name).some((a) => matchesAll(a, s.name)))
      if (hit) {
        have.push(label)
        const d = daysLeft(hit.expires_on)
        if (d !== null && d <= 5) saves.push({ name: hit.name, d })
      } else missing.push(label)
    }
    const total = have.length + missing.length || 1
    const coverage = have.length / total
    const liked = likes.some((l) => r.ing.some((i) => alts(i.name).some((a) => matches(a, l)))) || likes.some((l) => matches(r.title, l))
    return { r, have, missing, saves, coverage, score: coverage + saves.length * 0.4 - missing.length * 0.03 + (liked ? 0.25 : 0) }
  }).filter((x) => x.have.length > 0 && (x.coverage >= 0.5 || x.saves.length > 0)).sort((a, b) => b.score - a.score)
}
