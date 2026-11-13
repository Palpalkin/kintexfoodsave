// Разбор текста кассового чека (Магнит, Дикси, Пятёрочка и т.п.) в список позиций.
export type ReceiptItem = { name: string; quantity: number; unit: string; expires_on: string | null; guessed: boolean; sum: number | null }

// \b в JS не понимает кириллицу, поэтому границы слов задаём через lookaround.
const W = (src: string) => new RegExp(`(?<![а-яёa-z0-9])(?:${src})(?![а-яёa-z0-9])`, 'i')

const STOP = /^(итог|итого|к оплате|всего|сумма по чеку|оплата|безналичн|наличн|получено|сдача)/i
const SKIP = new RegExp(
  [
    W('инн|кассир|чек|ндс|смена|ккм|фн|фд|фпд|фп|тел|ооо|ао|ип|нал|сно|кол-во|цена|после').source,
    '(спасибо|дата|адрес|магазин|электронн|приход|скидк|бонус|карта|баллы|сайт|www|http|@|рн ккт|номер|время|продажа|покупк|сумма|№|тандер|агроторг|магнит|дикси|пят[её]рочк|перекр[её]ст|вкусвилл|ашан|гипермаркет|супермаркет|кассов|реквизит|ккт|ofd|офд)',
  ].join('|'), 'i')

const num = (s: string) => parseFloat(s.replace(',', '.').replace(/\s/g, ''))

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

export function parseReceipt(text: string): ReceiptItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const items: ReceiptItem[] = []
  let last: ReceiptItem | null = null

  for (const raw of lines) {
    if (STOP.test(raw)) break
    // строка количества: «2 x 49.90», «0.540 кг x 99.90», «2 шт х 49,90 = 99,80»
    const q = raw.match(/^(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт)?\s*[xх*×]\s*(\d+(?:[.,]\d+)?)(?:\s*=?\s*(\d+[.,]\d{2}))?/i)
    if (q && last) {
      last.quantity = num(q[1]); if (q[2]) last.unit = q[2].toLowerCase()
      last.sum = q[4] ? num(q[4]) : Math.round(num(q[1]) * num(q[3]) * 100) / 100
      continue
    }
    const letters = (raw.match(/[A-Za-zА-Яа-яЁё]/g) ?? []).length
    if (letters < 3 || SKIP.test(raw)) continue
    const name = clean(raw)
    if (name.replace(/[^A-Za-zА-Яа-яЁё]/g, '').length < 3) continue
    // количество в той же строке: «МОЛОКО 2 х 89.99»
    const inline = raw.match(/\s(\d+(?:[.,]\d+)?)\s*(кг|шт)?\s*[xх*×]\s*(\d+[.,]\d{2})(?:\s*=?\s*(\d+[.,]\d{2}))?/i)
    const trailing = raw.match(/(\d+[.,]\d{2})\s*$/)
    const item: ReceiptItem = {
      name, quantity: inline ? num(inline[1]) : 1, unit: inline?.[2]?.toLowerCase() ?? 'шт',
      expires_on: null, guessed: false,
      sum: inline ? (inline[4] ? num(inline[4]) : Math.round(num(inline[1]) * num(inline[3]) * 100) / 100) : trailing ? num(trailing[1]) : null,
    }
    items.push(item); last = item
  }
  return items
}
