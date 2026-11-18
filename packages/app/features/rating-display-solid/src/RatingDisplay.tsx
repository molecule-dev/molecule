/**
 * Solid star-rating display: fractional star rendering (inline SVG), optional
 * review-count tail, optional interactive mode via `onChange`.
 *
 * Solid counterpart of `@molecule/app-rating-display-react`'s
 * `RatingDisplay` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { RatingDisplayProps } from './types.js'

/** Star pixel size per size preset. */
const SIZE_PX = { sm: 12, md: 16, lg: 20 } as const

/** The star's single SVG path, identical to React's. */
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/**
 * Mints one star's gradient id, exactly as React's `Star` does.
 *
 * @returns The gradient id.
 */
const starId = (): string => `star-grad-${Math.random().toString(36).slice(2, 9)}`

/** Props for the internal {@link Star} helper. */
interface StarProps {
  /** Star fill fraction (0–1). */
  fill: number
  /** Pixel size of the square SVG (`undefined` omits both axes). */
  size: number | undefined
}

/**
 * Renders a single SVG star with a fractional fill gradient.
 *
 * @param props - Star fill fraction and pixel size.
 * @returns The star's `<svg>` element.
 */
const Star: Component<StarProps> = (props) => {
  const id = starId()
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${props.fill * 100}%`} stop-color="currentColor" />
          <stop offset={`${props.fill * 100}%`} stop-color="currentColor" stop-opacity="0.25" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={`url(#${id})`} />
    </svg>
  )
}

/**
 * Star-rating display supporting fractional values and an optional
 * review-count tail. When `onChange` is provided each star becomes an
 * interactive button.
 *
 * The stars sit in an inner span that carries the rating label — `role="img"`
 * when read-only, `role="group"` (holding the rate buttons) in interactive
 * mode — and the root is a plain flex span, exactly as React's does.
 *
 * Uses inline SVG stars so the component works without icon-font fallback.
 * Same props (React names) and same DOM as
 * `@molecule/app-rating-display-react`'s `RatingDisplay`.
 *
 * @param props - Component props (see {@link RatingDisplayProps}).
 * @returns The rendered rating display.
 */
export const RatingDisplay: Component<RatingDisplayProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const max = (): number => props.max ?? 5
  const px = (): number | undefined => SIZE_PX[props.size ?? 'md']
  // One flex row shared by the root and the stars span, so wrapping the stars
  // in the inner span leaves the layout as it was.
  const layout = cm.flex({ align: 'center', gap: 'xs' })
  const label = (): string =>
    props.ariaLabel ??
    t(
      'ratingDisplay.aria.rating',
      { value: props.value, max: max() },
      { defaultValue: 'Rating: {{value}} of {{max}}' },
    )
  const rateLabel = (star: number): string =>
    t(
      'ratingDisplay.aria.rate',
      { value: star, max: max() },
      { defaultValue: 'Rate {{value}} of {{max}}' },
    )
  const stars = (): { i: number; fill: number }[] =>
    Array.from({ length: max() }, (_value, i) => ({
      i,
      fill: Math.max(0, Math.min(1, props.value - i)),
    }))
  return (
    <span class={cm.cn(layout, props.className)}>
      <span class={layout} role={props.onChange ? 'group' : 'img'} aria-label={label()}>
        {stars().map(({ i, fill }) => (
          <Show when={props.onChange} fallback={<Star fill={fill} size={px()} />}>
            <button
              type="button"
              onClick={() => props.onChange?.(i + 1)}
              aria-pressed={i + 1 <= Math.round(props.value) ? 'true' : 'false'}
              aria-label={rateLabel(i + 1)}
            >
              <Star fill={fill} size={px()} />
            </button>
          </Show>
        ))}
      </span>
      <Show when={props.reviewCount !== undefined}>
        <Show
          when={props.onReviewsClick}
          fallback={<span class={cm.textSize('sm')}>({props.reviewCount})</span>}
        >
          <button
            type="button"
            onClick={(event) => props.onReviewsClick?.(event)}
            class={cm.cn(cm.textSize('sm'), cm.link)}
          >
            ({props.reviewCount})
          </button>
        </Show>
      </Show>
    </span>
  )
}
