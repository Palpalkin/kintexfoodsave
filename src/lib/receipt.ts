// Разбор текста кассового чека (Магнит, Дикси, Пятёрочка и т.п.) в список позиций.
export type ReceiptItem = { name: string; quantity: number; unit: string; expires_on: string | null; guessed: boolean }

// \b в JS не понимает кириллицу, поэтому границы слов задаём через lookaround.
const W = (src: string) => new RegExp(`(?<![а-яёa-z0-9])(?:${src})(?![а-яёa-z0-9])`, 'i')

const STOP = /^(итог|итого|к оплате|всего|сумма по чеку|оплата|безналичн|наличн|получено|сдача)/i
const SKIP = new RegExp(
  [
    W('инн|кассир|чек|ндс|смена|ккм|фн|фд|фпд|фп|тел|ооо|ао|ип|нал|сно|кол-во|цена|после').source,
    '(спасибо|дата|адрес|магазин|электронн|приход|скидк|бонус|карта|баллы|сайт|www|http|@|рн ккт|номер|время|продажа|покупк|сумма|№|тандер|агроторг|магнит|дикси|пят[её]рочк|перекр[её]ст|вкусвилл|ашан|гипермаркет|супермаркет|кассов|реквизит|ккт|ofd|офд)',
  ].join('|'), 'i')

const num = (s: string) => parseFloat(s.replace(',', '.').replace(/\s/g, ''))

// Сроки годности «по умолчанию» (дни с даты покупки) — приблизительные, пользователь может поправить.
const SHELF: [RegExp, number][] = [
  [/молок|кефир|ряженк|простокваш|сливк/i, 7], [/йогурт|десерт творож|снежок/i, 14], [/творог|сырок/i, 7],
  [/сметан/i, 14], [W('сыр[а-яё]*'), 30], [/масло сливоч|масло слив/i, 45], [/яйц/i, 25],
  [/хлеб|батон|булк|лаваш|багет/i, 5], [/(?<![а-яё])кур(?:иц|ин|а|ы)|цыпл|индейк|свинин|говяд|мясо|фарш|шашлык|печень|окорочок|филе/i, 3],
  [/колбас|сосиск|сардельк|ветчин|бекон/i, 10], [/рыба|форел|лосось|сельд|горбуш|треск|креветк/i, 3],
  [/помидор|томат|огурц|перец|баклажан|кабачок|салат|зелень|укроп|петрушк/i, 7],
  [W('лук[а-яё]*|картофел[а-яё]*|чеснок[а-яё]*|свекл[а-яё]*'), 30], [/морков|капуст/i, 21], [/яблок|груш|апельсин|мандарин|лимон/i, 21],
  [/банан|виноград|клубник|персик|слив[аы]?(?![а-яё])/i, 5], [/пельмен|вареник|заморож/i, 90],
]

export function guessExpiry(name: string, bought = new Date()): string | null {
  const hit = SHELF.find(([re]) => re.test(name))
  if (!hit) return null
  const d = new Date(bought); d.setDate(d.getDate() + hit[1])
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const nice = (n: string) => (n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLowerCase() : n)

function clean(name: string): string {
  return nice(name
    .replace(/^\s*\d{1,3}[.)]\s+/, '')           // номер позиции
    .replace(/^\s*\d{5,}\s+/, '')                // артикул/штрихкод
    .replace(/\s+\d+[.,]\d{2}\s*$/g, '')         // цена в конце
    .replace(/\s+\d+(?:[.,]\d+)?\s*(?:кг|г|л|мл|шт)?\s*[xх*×]\s*\d*.*$/i, '') // «2 х 49.90», «0,845 кг х»
    .replace(/[|_=~]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim())
}

export function parseReceipt(text: string, bought = new Date()): ReceiptItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const items: ReceiptItem[] = []
  let last: ReceiptItem | null = null

  for (const raw of lines) {
    if (STOP.test(raw)) break
    // строка количества: «2 x 49.90», «0.540 кг x 99.90», «2 шт х 49,90 = 99,80»
    const q = raw.match(/^(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт)?\s*[xх*×]\s*\d+(?:[.,]\d+)?/i)
    if (q && last) {
      last.quantity = num(q[1]); if (q[2]) last.unit = q[2].toLowerCase()
      continue
    }
    const letters = (raw.match(/[A-Za-zА-Яа-яЁё]/g) ?? []).length
    if (letters < 3 || SKIP.test(raw)) continue
    const name = clean(raw)
    if (name.replace(/[^A-Za-zА-Яа-яЁё]/g, '').length < 3) continue
    // количество в той же строке: «МОЛОКО 2 х 89.99»
    const inline = raw.match(/\s(\d+(?:[.,]\d+)?)\s*(кг|шт)?\s*[xх*×]\s*\d+[.,]\d{2}/i)
    const item: ReceiptItem = {
      name, quantity: inline ? num(inline[1]) : 1, unit: inline?.[2]?.toLowerCase() ?? 'шт',
      expires_on: guessExpiry(name, bought), guessed: true,
    }
    items.push(item); last = item
  }
  return items
}
