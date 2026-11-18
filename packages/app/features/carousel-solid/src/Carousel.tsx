/**
 * Solid carousel: generic image / card carousel with arrows, dots and optional
 * autoplay — the Solid counterpart of `@molecule/app-carousel-react`'s
 * `Carousel`: the same props (React names), the same DOM for the same input,
 * and the same callbacks.
 *
 * @module
 */

import { type Component, createEffect, createSignal, For, onCleanup } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { CarouselProps } from './types.js'

// Arrow offsets + vertical centering, exactly as React writes them: the
// ClassMap contract exposes no left/right/top or translate resolver (only
// `position` + `inset0`), so the edge offsets and the -50% Y translate that
// centers each arrow are inline — a sanctioned "ClassMap can't express it"
// case. Left arrow pins to the left edge, right arrow to the right edge; both
// sit at the vertical middle.
const arrowLeftStyle = { left: '8px', top: '50%', transform: 'translateY(-50%)' }
const arrowRightStyle = { right: '8px', top: '50%', transform: 'translateY(-50%)' }

// The dot button's hit target is a bare transparent square: the inline
// background/border/padding are native resets, not a competing design, and the
// 8px dot is drawn by the child span.
const dotStyle = { background: 'transparent', border: 'none', padding: '4px' }

/**
 * Generic image / card carousel with arrows + dots + optional autoplay.
 * Controlled-optional: omit `index` to let the component manage its own state.
 *
 * @param props - Component props (see {@link CarouselProps}).
 * @returns The rendered carousel, or nothing when there are no slides.
 */
export const Carousel: Component<CarouselProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React reads `children.length` once per render; Solid reads its node
  // children once, at mount, and the slide list stays as React's does.
  const raw = props.children
  const slides =
    raw === undefined || raw === null || raw === false ? [] : Array.isArray(raw) ? raw : [raw]
  const total = slides.length
  // React's `useState(0)` / `useState(false)`.
  const [internal, setInternal] = createSignal(0)
  const [hovered, setHovered] = createSignal(false)

  /** React's `const active = index ?? internal`. */
  const active = (): number => props.index ?? internal()

  /**
   * Moves to an index, clamping or wrapping exactly as React's `setIdx` does,
   * then reports the clamped value through `onChange` (also when controlled).
   *
   * @param next - The requested index.
   */
  const setIdx = (next: number): void => {
    const clamped =
      (props.loop ?? true) ? (next + total) % total : Math.max(0, Math.min(total - 1, next))
    if (props.index === undefined) setInternal(clamped)
    props.onChange?.(clamped)
  }

  // React's autoplay effect: an interval that advances by one and restarts on
  // every change of the index, the interval, the hover state or the prop
  // values `setIdx` closes over (React lists `setIdx` itself as a dependency).
  createEffect(() => {
    const autoplayMs = props.autoplayMs ?? 0
    const pauseOnHover = props.pauseOnHover ?? true
    const current = active()
    void props.index
    void props.loop
    if (!autoplayMs || (pauseOnHover && hovered())) return
    const id = setInterval(() => setIdx(current + 1), autoplayMs)
    onCleanup(() => clearInterval(id))
  })

  if (total === 0) return null

  return (
    <div
      class={cm.cn(cm.position('relative'), props.className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: `${total * 100}%`,
            transform: `translateX(-${(active() / total) * 100}%)`,
            transition: 'transform 250ms ease',
          }}
        >
          <For each={slides}>
            {(child, i) => (
              <div
                data-mol-id="carousel-slide"
                aria-hidden={i() !== active() ? 'true' : 'false'}
                style={{ width: `${100 / total}%`, 'flex-shrink': '0' }}
              >
                {child}
              </div>
            )}
          </For>
        </div>
      </div>
      {(props.showArrows ?? true) && total > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(active() - 1)}
            aria-label={t('carousel.previous', {}, { defaultValue: 'Previous' })}
            className={cm.position('absolute')}
            style={arrowLeftStyle}
          >
            ‹
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(active() + 1)}
            aria-label={t('carousel.next', {}, { defaultValue: 'Next' })}
            className={cm.position('absolute')}
            style={arrowRightStyle}
          >
            ›
          </Button>
        </>
      )}
      {(props.showDots ?? true) && total > 1 && (
        <div
          class={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'xs' }), cm.sp('py', 2))}
        >
          <For each={slides}>
            {(_child, i) => (
              <button
                type="button"
                data-mol-id="carousel-dot"
                data-active={i() === active() ? 'true' : 'false'}
                aria-label={t(
                  'carousel.goToSlide',
                  { index: i() + 1 },
                  { defaultValue: 'Go to slide {{index}}' },
                )}
                aria-current={i() === active() ? 'true' : undefined}
                onClick={() => setIdx(i())}
                class={cm.cn(
                  cm.cursorPointer,
                  cm.touchTargetCompact,
                  cm.flex({ align: 'center', justify: 'center' }),
                )}
                style={dotStyle}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    width: '8px',
                    height: '8px',
                    'border-radius': '50%',
                    // Theme tokens: the inactive dot was `rgba(0,0,0,0.2)`, which
                    // is invisible on a dark surface.
                    background:
                      i() === active()
                        ? 'var(--mol-color-primary, currentColor)'
                        : 'var(--mol-color-border, rgba(128,128,128,0.4))',
                  }}
                />
              </button>
            )}
          </For>
        </div>
      )}
    </div>
  )
}
