import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cleanCode, validCode } from '@/lib/barcode'

type Props = { onDetect: (code: string) => void; onClose: () => void }

/** Камера + чтение EAN/UPC. Библиотека грузится только при открытии сканера. */
export function BarcodeScanner({ onDetect, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const cb = useRef(onDetect)
  cb.current = onDetect // актуальный обработчик без перезапуска камеры при перерисовке

  useEffect(() => {
    let stop = () => {}
    let done = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/library')
        const hints = new Map<number, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
          [DecodeHintType.TRY_HARDER, true],
        ])
        const reader = new BrowserMultiFormatReader(hints as never, 250)
        stop = () => reader.reset()
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current!,
          (res) => {
            if (done || !res) return
            const code = cleanCode(res.getText())
            if (validCode(code)) { done = true; navigator.vibrate?.(60); stop(); cb.current(code) }
          },
        )
      } catch (e) {
        const n = e instanceof Error ? e.name : ''
        setErr(n === 'NotAllowedError' ? 'Нет доступа к камере: разрешите её в настройках браузера или введите код вручную.' : 'Не удалось запустить камеру. Введите код вручную.')
      }
    })()
    return () => { done = true; stop() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3">
        <div className="flex items-center justify-between text-[#ffffff]">
          <span className="font-medium">Наведите камеру на штрихкод</span>
          <Button variant="ghost" size="icon" className="text-[#ffffff] hover:bg-white/10" onClick={onClose}><X /></Button>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-green-400/80" />
        </div>
        {err && <p className="rounded-lg bg-orange-100 p-3 text-sm text-orange-900">{err}</p>}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = cleanCode(manual); if (validCode(c)) onDetect(c); else setErr('Штрихкод — это 8, 12, 13 или 14 цифр') }}>
          <Input inputMode="numeric" placeholder="Или введите цифры кода" value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button>OK</Button>
        </form>
      </div>
    </div>
  )
}
