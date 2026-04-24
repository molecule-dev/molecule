import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"). */
  symbol: ReactNode
  /** Full name display ("Bitcoin", "Apple Inc."). */
  name?: ReactNode
  /** Optional leading icon / logo. */
  icon?: ReactNode
  /** Current price (formatted string). */
  price: ReactNode
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). */
  changeDisplay?: ReactNode
  /** Optional sparkline node (pass `<Sparkline values={...} />` from `app-sparkline-react`). */
  sparkline?: ReactNode
  /** Optional volume / market-cap display. */
  meta?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards.
 * @param root0
 * @param root0.symbol
 * @param root0.name
 * @param root0.icon
 * @param root0.price
 * @param root0.changePct
 * @param root0.changeDisplay
 * @param root0.sparkline
 * @param root0.meta
 * @param root0.onClick
 * @param root0.className
 */
export function TickerRow({
  symbol,
  name,
  icon,
  price,
  changePct,
  changeDisplay,
  sparkline,
  meta,
  onClick,
  className,
}: TickerRowProps) {
  const cm = getClassMap()
  const positive = changePct !== undefined && changePct > 0
  const negative = changePct !== undefined && changePct < 0
  const color = positive ? '#22c55e' : negative ? '#ef4444' : undefined
  const arrow = positive ? '▲' : negative ? '▼' : '–'
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      {icon && <div className={cm.shrink0}>{icon}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{symbol}</span>
        {name && <span className={cm.textSize('xs')}>{name}</span>}
      </div>
      {sparkline && <div className={cm.shrink0}>{sparkline}</div>}
      <div className={cm.cn(cm.textCenter, cm.stack(0 as const))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{price}</span>
        {(changeDisplay !== undefined || changePct !== undefined) && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))} style={{ color }}>
            {arrow} {changeDisplay ?? `${changePct?.toFixed(2)}%`}
          </span>
        )}
      </div>
      {meta && <div className={cm.cn(cm.textSize('xs'), cm.shrink0)}>{meta}</div>}
    </div>
  )
}
