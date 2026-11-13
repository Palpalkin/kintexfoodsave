// Чтение QR-кода кассового чека (формат ФНС): t=20261113T1045&s=550.54&fn=...&i=...&fp=...&n=1
// QR хранит только реквизиты чека (дата, сумма, ФН/ФД/ФП), а не список товаров.
import jsQR from 'jsqr'

export type FiscalQr = {
  raw: string
  date: string | null   // YYYY-MM-DD
  sum: number | null    // рубли
  fn: string; i: string; fp: string; n: string
}

export function parseFiscalQr(raw: string): FiscalQr | null {
  const p = new URLSearchParams(raw.trim().replace(/^.*?\?/, ''))
  const fn = p.get('fn'), i = p.get('i'), fp = p.get('fp'), s = p.get('s'), t = p.get('t')
  if (!fn || !i || !fp || !(s || t)) return null
  let date: string | null = null
  const m = t?.match(/^(\d{4})-?(\d{2})-?(\d{2})/)
  if (m) date = `${m[1]}-${m[2]}-${m[3]}`
  const sum = s ? parseFloat(s.replace(',', '.')) : NaN
  return { raw: raw.trim(), date, sum: Number.isFinite(sum) ? sum : null, fn, i, fp, n: p.get('n') ?? '1' }
}

type Pixels = { data: Uint8ClampedArray; width: number; height: number }

/** Ищет QR в пикселях; QR на чеках бывает мелким, поэтому пробуем несколько масштабов и участков. */
export function findQrInPixels(get: (x: number, y: number, w: number, h: number, scale: number) => Pixels, W: number, H: number): FiscalQr | null {
  const regions: [number, number, number, number][] = [
    [0, 0, W, H], [0, H * 0.5, W, H * 0.5], [0, H * 0.7, W, H * 0.3], [0, 0, W, H * 0.5],
  ]
  for (const [x, y, w, h] of regions) {
    for (const maxSide of [1600, 1000, 2400]) {
      const scale = Math.min(1.5, maxSide / Math.max(w, h))
      const px = get(Math.round(x), Math.round(y), Math.round(w), Math.round(h), scale)
      const hit = jsQR(px.data, px.width, px.height, { inversionAttempts: 'attemptBoth' })
      if (hit) { const q = parseFiscalQr(hit.data); if (q) return q }
    }
  }
  return null
}

export async function readReceiptQr(file: Blob): Promise<FiscalQr | null> {
  const bmp = await createImageBitmap(file)
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const res = findQrInPixels((x, y, w, h, scale) => {
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale))
    ctx.drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height)
    return ctx.getImageData(0, 0, c.width, c.height)
  }, bmp.width, bmp.height)
  bmp.close?.()
  return res
}
