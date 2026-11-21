// Экран загрузки: логотип «дышит», кольцо вращается, под ним бегущая полоска.
export function Splash() {
  return (
    <div className="fs-splash" role="status" aria-label="Loading">
      <div className="fs-splash-logo"><span className="fs-ring" /><img src="/icon-192.png" alt="" width={96} height={96} /></div>
      <div className="fs-splash-name">KINTEX FOODSAVE</div>
      <div className="fs-bar"><i /></div>
    </div>
  )
}

/** Заглушка списка продуктов, пока идёт первая загрузка. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="fs-skel-row" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="fs-skel h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2"><div className="fs-skel h-3.5 w-2/3 rounded" /><div className="fs-skel h-3 w-1/3 rounded" /></div>
          <div className="fs-skel h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}
