/**
 * Vue star-rating display: fractional star rendering (inline SVG), optional
 * review-count tail, optional interactive mode via `onChange`.
 *
 * Vue counterpart of `@molecule/app-rating-display-react`'s `RatingDisplay` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

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

/**
 * Renders a single SVG star with a fractional fill gradient.
 *
 * @param fill - Star fill fraction (0–1).
 * @param size - Pixel size of the square SVG (`undefined` omits both axes).
 * @param id - The gradient's id, unique per star.
 * @returns The star's `<svg>` node.
 */
const star = (fill: number, size: number | undefined, id: string): VNode =>
  h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    h('defs', [
      h('linearGradient', { id }, [
        h('stop', { offset: `${fill * 100}%`, 'stop-color': 'currentColor' }),
        h('stop', {
          offset: `${fill * 100}%`,
          'stop-color': 'currentColor',
          'stop-opacity': 0.25,
        }),
      ]),
    ]),
    h('path', { d: STAR_PATH, fill: `url(#${id})` }),
  ])

/**
 * Star-rating display supporting fractional values and an optional
 * review-count tail. When `onChange` is provided each star becomes an
 * interactive button.
 *
 * Uses inline SVG stars so the component works without icon-font fallback.
 * Same props (React names) and same DOM as
 * `@molecule/app-rating-display-react`'s `RatingDisplay`.
 *
 * @param props - Component props (see {@link RatingDisplayProps}).
 * @returns The rating display component.
 */
export const RatingDisplay = defineComponent({
  name: 'RatingDisplay',
  props: {
    value: { type: Number, required: true },
    max: { type: Number, default: 5 },
    reviewCount: { type: Number, default: undefined },
    onReviewsClick: {
      type: Function as PropType<RatingDisplayProps['onReviewsClick']>,
      default: undefined,
    },
    size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md' },
    onChange: { type: Function as PropType<RatingDisplayProps['onChange']>, default: undefined },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const max = props.max
      const px: number | undefined = SIZE_PX[props.size]
      const stars: VNode[] = []
      for (let i = 0; i < max; i++) {
        const fill = Math.max(0, Math.min(1, props.value - i))
        const icon = star(fill, px, starId())
        stars.push(
          props.onChange
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: () => props.onChange?.(i + 1),
                  'aria-label': `Rate ${i + 1} of ${max}`,
                },
                [icon],
              )
            : icon,
        )
      }
      return h(
        'span',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
          role: 'img',
          'aria-label': props.ariaLabel ?? `Rating: ${props.value} of ${max}`,
        },
        [
          ...stars,
          props.reviewCount !== undefined &&
            (props.onReviewsClick
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: (event: MouseEvent) => props.onReviewsClick?.(event),
                    class: cm.cn(cm.textSize('sm'), cm.link),
                  },
                  [`(${props.reviewCount})`],
                )
              : h('span', { class: cm.textSize('sm') }, [`(${props.reviewCount})`])),
        ],
      )
    }
  },
})
