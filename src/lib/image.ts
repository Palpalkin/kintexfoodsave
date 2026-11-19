import { t } from './i18n'
// Сжатие фото на клиенте перед загрузкой: макс. 1024px, WebP ~0.8 (обычно < 150 КБ).
export async function compressImage(file: File, maxSide = 1024, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
  if (blob) return blob
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
  if (!jpg) throw new Error(t('utils.compressFail'))
  return jpg
}
