import type { ReactElement, ReactNode } from 'react'
import { useId } from 'react'

import { useLocale, useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link TickerRow} component. */
export interface TickerRowProps {
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
  /** Optional volume / market-cap display. May hold a control; it keeps its own clicks. */
  meta?: ReactNode
  /**
   * Click handler. While it is set the whole row is clickable through a
   * transparent native button laid over it, named by the symbol; the inner
   * controls (the `meta` slot) sit above that button and keep their own
   * clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards.
 * @param props - Component props (see {@link TickerRowProps}).
 */
export function TickerRow({
  symbol,
  name,
  icon: iconProp,
  price,
  changePct,
  changeDisplay,
  sparkline: sparklineProp,
  meta: metaProp,
  onClick,
  className,
}: TickerRowProps): ReactElement {
  const icon = slot(iconProp)
  const sparkline = slot(sparklineProp)
  const meta = slot(metaProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-renders on a locale switch, so the formatted percentage follows it.
  const locale = useLocale()
  /** The id that names the open button (React's `useId`), on the symbol. */
  const nameId = useId()
  const positive = changePct !== undefined && changePct > 0
  const negative = changePct !== undefined && changePct < 0
  const colorClass = positive ? cm.textSuccess : negative ? cm.textError : undefined
  const arrow = positive ? '▲' : negative ? '▼' : '–'
  const directionLabel = positive
    ? t('tickerRow.change.up', {}, { defaultValue: 'Up' })
    : negative
      ? t('tickerRow.change.down', {}, { defaultValue: 'Down' })
      : t('tickerRow.change.flat', {}, { defaultValue: 'Unchanged' })
  const formattedChange =
    changePct !== undefined
      ? new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(changePct / 100)
      : ''
  return (
    <Box
      as="div"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        onClick ? cm.position('relative') : undefined,
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      {onClick && (
        <Pressable
          as="button"
          type="button"
          aria-labelledby={nameId}
          data-mol-id="ticker-row-open"
          onClick={() => onClick()}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an empty,
             transparent button over the row; the inline background/border/padding are
             native resets. */
          className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={{ padding: 0 }}
          webStyle={{ background: 'transparent', border: 'none' }}
        />
      )}
      {icon && (
        <Box as="div" className={cm.shrink0}>
          {icon}
        </Box>
      )}
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <Box
          as="span"
          id={onClick ? nameId : undefined}
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
        >
          {symbol}
        </Box>
        {name && (
          <Box as="span" className={cm.textSize('xs')}>
            {name}
          </Box>
        )}
      </Box>
      {sparkline && (
        <Box as="div" className={cm.shrink0}>
          {sparkline}
        </Box>
      )}
      <Box as="div" className={cm.cn(cm.textCenter, cm.stack(0 as const))}>
        <Box as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {price}
        </Box>
        {(changeDisplay !== undefined || changePct !== undefined) && (
          <Box
            as="span"
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), colorClass)}
          >
            <Text as="span" aria-hidden="true">
              {arrow}
            </Text>
            <Text as="span" className={cm.cn(cm.srOnly)}>
              {directionLabel}
            </Text>{' '}
            {changeDisplay ?? formattedChange}
          </Box>
        )}
      </Box>
      {meta && (
        // Raised above the open button in its positioned wrapper while the row
        // is clickable, so a click on its content lands here and keeps its own
        // clicks.
        <Box
          as="div"
          className={cm.cn(
            cm.textSize('xs'),
            cm.shrink0,
            onClick ? cm.position('relative') : undefined,
          )}
        >
          {meta}
        </Box>
      )}
    </Box>
  )
}
