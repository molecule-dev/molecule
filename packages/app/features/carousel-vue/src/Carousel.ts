/**
 * Vue carousel: generic image / card carousel with arrows, dots and optional
 * autoplay — the Vue counterpart of `@molecule/app-carousel-react`'s
 * `Carousel`: the same props (React names), the same DOM for the same input,
 * and the same callbacks.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watchEffect,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { CarouselProps } from './types.js'

// Arrow offsets + vertical centering, exactly as React writes them: the
// ClassMap contract exposes no left/right/top or translate resolver (only
// `position` + `inset0`), so the edge offsets and the -50% Y translate that
// centers each arrow are inline — a sanctioned "ClassMap can't express it"
// case. Left arrow pins to the left edge, right arrow to the right edge; both
// sit at the vertical middle.
const arrowLeftStyle = { left: '8px', top: '50%', transform: 'translateY(-50%)' }
const arrowRightStyle = { right: '8px', top: '50%', transform: 'translateY(-50%)' }

/**
 * Normalizes the slides to a child list: an array stays as it is, and the values
 * React renders as nothing (`null`, `undefined`, `false`) contribute nothing.
 *
 * @param value - The children, from the default slot or the `children` prop.
 * @returns The slide nodes, in order.
 */
const childList = (value: VNodeChild[] | VNodeChild | null | undefined): VNodeChild[] => {
  const list = Array.isArray(value) ? value : value == null || value === false ? [] : [value]
  return list.filter((child) => child !== null && child !== undefined && child !== false)
}

/**
 * Generic image / card carousel with arrows + dots + optional autoplay.
 * Controlled-optional: omit `index` to let the component manage its own state.
 *
 * @param props - Component props (see {@link CarouselProps}).
 * @returns The carousel component.
 */
export const Carousel = defineComponent({
  name: 'Carousel',
  props: {
    children: null,
    index: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    onChange: Function as PropType<CarouselProps['onChange']>,
    showArrows: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    showDots: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    autoplayMs: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    pauseOnHover: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    loop: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // React's `useState(0)`: the uncontrolled active index.
    const internal = ref(0)
    // React's `useState(false)`: the pointer-over state autoplay pauses on.
    const hovered = ref(false)
    // React's `children.length`, read during render and used by `setIdx` when a
    // control is clicked.
    const total = ref(0)
    /** React's `const active = index ?? internal`. */
    const active = computed(() => props.index ?? internal.value)

    /**
     * Moves to an index, clamping or wrapping exactly as React's `setIdx` does,
     * then reports the clamped value through `onChange` (also when controlled).
     *
     * @param next - The requested index.
     */
    const setIdx = (next: number): void => {
      const count = total.value
      const clamp = props.loop ?? true
      const clamped = clamp ? (next + count) % count : Math.max(0, Math.min(count - 1, next))
      if (props.index === undefined) internal.value = clamped
      props.onChange?.(clamped)
    }

    // React's autoplay effect: an interval that advances by one and restarts on
    // every change of the index, the interval, the hover state or the prop
    // values `setIdx` closes over (React lists `setIdx` itself as a dependency).
    watchEffect((onCleanup) => {
      const autoplayMs = props.autoplayMs ?? 0
      const pauseOnHover = props.pauseOnHover ?? true
      const current = active.value
      // Read the values `setIdx` closes over so a change re-runs the effect.
      void props.index
      void props.loop
      void total.value
      if (!autoplayMs || (pauseOnHover && hovered.value)) return
      const id = setInterval(() => setIdx(current + 1), autoplayMs)
      onCleanup(() => clearInterval(id))
    })

    return (): VNode | null => {
      const kids = childList(slots.default?.() ?? props.children)
      total.value = kids.length
      if (kids.length === 0) return null
      const count = kids.length
      const current = active.value
      const showArrows = props.showArrows ?? true
      const showDots = props.showDots ?? true

      return h(
        'div',
        {
          class: cm.cn(cm.position('relative'), props.className),
          onMouseenter: () => {
            hovered.value = true
          },
          onMouseleave: () => {
            hovered.value = false
          },
        },
        [
          h('div', { style: { overflow: 'hidden' } }, [
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  width: `${count * 100}%`,
                  transform: `translateX(-${(current / count) * 100}%)`,
                  transition: 'transform 250ms ease',
                },
              },
              kids.map((child, i) =>
                h(
                  'div',
                  {
                    key: i,
                    'data-mol-id': 'carousel-slide',
                    'aria-hidden': i !== current ? 'true' : 'false',
                    style: { width: `${100 / count}%`, flexShrink: 0 },
                  },
                  [child],
                ),
              ),
            ),
          ]),
          ...(showArrows && count > 1
            ? [
                h(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => setIdx(current - 1),
                    'aria-label': t('carousel.previous', {}, { defaultValue: 'Previous' }),
                    class: cm.position('absolute'),
                    style: arrowLeftStyle,
                  },
                  { default: () => ['‹'] },
                ),
                h(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => setIdx(current + 1),
                    'aria-label': t('carousel.next', {}, { defaultValue: 'Next' }),
                    class: cm.position('absolute'),
                    style: arrowRightStyle,
                  },
                  { default: () => ['›'] },
                ),
              ]
            : []),
          ...(showDots && count > 1
            ? [
                h(
                  'div',
                  {
                    class: cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      cm.sp('py', 2),
                    ),
                  },
                  kids.map((_, i) =>
                    h(
                      'button',
                      {
                        key: i,
                        type: 'button',
                        'data-mol-id': 'carousel-dot',
                        'data-active': i === current ? 'true' : 'false',
                        'aria-label': t(
                          'carousel.goToSlide',
                          { index: i + 1 },
                          { defaultValue: 'Go to slide {{index}}' },
                        ),
                        'aria-current': i === current ? 'true' : undefined,
                        onClick: () => setIdx(i),
                        class: cm.cn(
                          cm.cursorPointer,
                          cm.touchTargetCompact,
                          cm.flex({ align: 'center', justify: 'center' }),
                        ),
                        style: { background: 'transparent', border: 'none', padding: '4px' },
                      },
                      [
                        h('span', {
                          'aria-hidden': 'true',
                          style: {
                            display: 'block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background:
                              i === current
                                ? 'var(--mol-color-primary, currentColor)'
                                : 'var(--mol-color-border, rgba(128,128,128,0.4))',
                          },
                        }),
                      ],
                    ),
                  ),
                ),
              ]
            : []),
        ],
      )
    }
  },
})
