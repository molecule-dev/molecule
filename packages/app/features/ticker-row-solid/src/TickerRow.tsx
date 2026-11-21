/**
 * Solid financial ticker row: symbol + price + change% + optional icon,
 * sparkline and meta.
 *
 * Solid counterpart of `@molecule/app-ticker-row-react`'s `TickerRow` — the
 * same props (React names), the same DOM for the same input, and the same
 * i18n keys.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { createUniqueId } from 'solid-js'

import { useLocale, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TickerRowProps } from './types.js'

/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards. `changePct`
 * drives the ▲/▼/– direction and the theme's success/error text tokens
 * (`cm.textSuccess` / `cm.textError`); `price` and `meta` are opaque display
 * nodes — the app owns formatting, and the default percentage text comes from
 * `Intl.NumberFormat` in the app's active locale. While `onClick` is set the
 * whole row is clickable through a transparent native button laid over it,
 * named by the symbol; the inner controls (the `meta` slot) sit above that
 * button and keep their own clicks. A native button turns Enter and Space
 * into the same click itself.
 *
 * @param props - Component props (see {@link TickerRowProps}).
 * @returns The rendered ticker row.
 */
export const TickerRow: Component<TickerRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Read in the JSX and formatters, so the formatted percentage follows a
  // locale switch (React's `useLocale()`).
  const locale = useLocale()
  /** The id that names the open button (Solid's `createUniqueId`), on the symbol. */
  const nameId = createUniqueId()
  const positive = (): boolean => props.changePct !== undefined && props.changePct > 0
  const negative = (): boolean => props.changePct !== undefined && props.changePct < 0
  const colorClass = (): string | undefined =>
    positive() ? cm.textSuccess : negative() ? cm.textError : undefined
  const arrow = (): string => (positive() ? '▲' : negative() ? '▼' : '–')
  /** React's `t()` direction words, read reactively. */
  const directionLabel = (): string =>
    positive()
      ? t('tickerRow.change.up', {}, { defaultValue: 'Up' })
      : negative()
        ? t('tickerRow.change.down', {}, { defaultValue: 'Down' })
        : t('tickerRow.change.flat', {}, { defaultValue: 'Unchanged' })
  // React's `changeDisplay ?? Intl…format(changePct / 100)`: a defined display
  // wins, else the percentage in the app's active locale (the pair is never
  // both absent when this renders).
  const changeText = (): JSX.Element | string =>
    props.changeDisplay ??
    new Intl.NumberFormat(locale(), {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(props.changePct! / 100)
  /**
   * The open button's native resets. Read through a call so the DOM style
   * runtime applies it through the CSSOM, exactly as React does.
   */
  const openStyle = (): Record<string, string> => ({
    background: 'transparent',
    border: 'none',
    padding: '0px',
  })
  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        props.onClick ? cm.position('relative') : undefined,
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
    >
      {props.onClick && (
        // The row's open action: an empty, transparent native button covering
        // the whole row (Enter / Space activate it natively), named by the
        // symbol. A sibling of the row's other content, not their wrapper.
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="ticker-row-open"
          onClick={() => props.onClick?.()}
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={openStyle()}
        />
      )}
      {props.icon && <div class={cm.shrink0}>{props.icon}</div>}
      <div class={cm.cn(cm.flex1, cm.stack(0))}>
        {/* The id names the open button (React's `aria-labelledby`). */}
        <span
          id={props.onClick ? nameId : undefined}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
        >
          {props.symbol}
        </span>
        {props.name && <span class={cm.textSize('xs')}>{props.name}</span>}
      </div>
      {props.sparkline && <div class={cm.shrink0}>{props.sparkline}</div>}
      <div class={cm.cn(cm.textCenter, cm.stack(0))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.price}</span>
        {(props.changeDisplay !== undefined || props.changePct !== undefined) && (
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), colorClass())}>
            <span aria-hidden="true">{arrow()}</span>
            {/* The direction in words for screen readers; the arrow is read
                aloud as a glyph otherwise. */}
            <span class={cm.cn(cm.srOnly)}>{directionLabel()}</span> {changeText()}
          </span>
        )}
      </div>
      {props.meta && (
        // Raised above the open button in its positioned wrapper while the row
        // is clickable, so a click on its content lands here and keeps its own
        // clicks.
        <div
          class={cm.cn(
            cm.textSize('xs'),
            cm.shrink0,
            props.onClick ? cm.position('relative') : undefined,
          )}
        >
          {props.meta}
        </div>
      )}
    </div>
  )
}
