// OCR чека прямо в браузере (tesseract.js). Движок и русская модель лежат в /tesseract
// на нашем же домене: бесплатно, без внешних API, после первой загрузки кэшируются service worker'ом.
import { createWorker, OEM, PSM } from 'tesseract.js'
import { t } from './i18n'

/** Подготовка фото: масштаб до ~1700px по ширине, оттенки серого, растяжение контраста. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const target = 1700
  const scale = Math.min(2, target / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const hist = new Uint32Array(256)
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0
    d[i] = d[i + 1] = d[i + 2] = g; hist[g]++
  }
  const total = c.width * c.height
  let lo = 0, hi = 255, acc = 0
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.01) { lo = i; break } }
  acc = 0
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.2) { hi = i; break } }
  const k = 255 / Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, (d[i] - lo) * k))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export async function recognizeReceipt(file: File, onProgress: (p: number, label: string) => void): Promise<string> {
  onProgress(0.02, t('ocr.preparing'))
  const canvas = await prepare(file)
  const worker = await createWorker('rus', OEM.LSTM_ONLY, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tesseract/lang',
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(0.2 + m.progress * 0.8, t('ocr.recognizing'))
      else if (m.status.includes('loading')) onProgress(0.1 + m.progress * 0.1, t('ocr.loadingModel'))
    },
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}
