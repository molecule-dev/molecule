<!--
  Carousel: the Svelte counterpart of `@molecule/app-carousel-react`'s
  `Carousel` — generic image / card carousel with arrows, dots and optional
  autoplay. Same props (React names), same DOM for the same input, same
  callbacks.

  React maps its `children` array to one wrapper `<div>` per slide. A Svelte
  snippet is opaque (it has no count and gives no access to one child), so the
  list is data: `items` holds one entry per slide and the `children` snippet
  renders one entry. This component's own `{#each}` renders the wrappers, so
  Svelte places every node and nothing is moved after it rendered.

  The markup is written without whitespace between sibling elements, and is
  `prettier-ignore`d to stay that way: React renders no text nodes between the
  arrows or the dots, while Svelte keeps a template's indentation as text nodes.
-->
<script lang="ts" generics="T">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { CarouselProps } from './types.js'

  let {
    items = [],
    children,
    index,
    onChange,
    showArrows = true,
    showDots = true,
    autoplayMs = 0,
    pauseOnHover = true,
    loop = true,
    className,
  }: CarouselProps<T> = $props()

  // Arrow offsets + vertical centering, exactly as React writes them: the
  // ClassMap contract exposes no left/right/top or translate resolver (only
  // `position` + `inset0`), so the edge offsets and the -50% Y translate that
  // centers each arrow are inline — a sanctioned "ClassMap can't express it"
  // case. Left arrow pins to the left edge, right arrow to the right edge; both
  // sit at the vertical middle.
  const arrowLeftStyle = { left: '8px', top: '50%', transform: 'translateY(-50%)' }
  const arrowRightStyle = { right: '8px', top: '50%', transform: 'translateY(-50%)' }
  // The dot button's hit target is a bare transparent square: the inline
  // background/border/padding are native resets, not a competing design, and
  // the 8px dot is drawn by the child span.
  const dotStyle = 'background: transparent; border: none; padding: 4px'
  // Theme tokens: the inactive dot was `rgba(0,0,0,0.2)`, which is invisible on
  // a dark surface.
  const ACTIVE_DOT = 'var(--mol-color-primary, currentColor)'
  const INACTIVE_DOT = 'var(--mol-color-border, rgba(128,128,128,0.4))'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's `useState(0)` / `useState(false)`.
  let internal = $state(0)
  let hovered = $state(false)
  /** React's `children.length`. */
  const count = $derived(items.length)
  /** React's `const active = index ?? internal`. */
  const active = $derived(index ?? internal)

  /**
   * Moves to an index, clamping or wrapping exactly as React's `setIdx` does,
   * then reports the clamped value through `onChange` (also when controlled).
   *
   * @param next - The requested index.
   */
  function setIdx(next: number): void {
    const clamped = loop ? (next + count) % count : Math.max(0, Math.min(count - 1, next))
    if (index === undefined) internal = clamped
    onChange?.(clamped)
  }

  /**
   * One slide wrapper's inline style, written through the CSSOM as React writes it.
   *
   * @param node - The wrapper.
   * @param total - The slide count.
   * @returns The action's update hook.
   */
  function slideStyle(node: HTMLElement, total: number): { update(next: number): void } {
    const apply = (next: number): void => {
      node.style.width = `${100 / next}%`
      node.style.flexShrink = '0'
    }
    apply(total)
    return { update: apply }
  }

  /** The track's inline style — React's flex track, translated to the active slide. */
  const trackStyle = $derived(
    `display: flex; width: ${count * 100}%; transform: translateX(-${
      count === 0 ? 0 : (active / count) * 100
    }%); transition: transform 250ms ease`,
  )

  /**
   * The inline style of one dot glyph — React's 8px circle in the active or
   * inactive theme token.
   *
   * @param i - The dot's slide index.
   * @returns The declaration string.
   */
  function dotFill(i: number): string {
    const fill = i === active ? ACTIVE_DOT : INACTIVE_DOT
    return `display: block; width: 8px; height: 8px; border-radius: 50%; background: ${fill}`
  }

  /**
   * The pointer-over listeners autoplay pauses on: React's `onMouseEnter` /
   * `onMouseLeave` on the root `<div>`, installed on the element so the root
   * stays attribute-for-attribute React's (a bare `<div>` with no ARIA role).
   *
   * @param node - The root element.
   * @param report - Receives each enter / leave.
   * @returns The action's teardown.
   */
  function hoverState(node: HTMLElement, report: (over: boolean) => void): { destroy(): void } {
    const enter = (): void => report(true)
    const leave = (): void => report(false)
    node.addEventListener('mouseenter', enter)
    node.addEventListener('mouseleave', leave)
    return {
      destroy(): void {
        node.removeEventListener('mouseenter', enter)
        node.removeEventListener('mouseleave', leave)
      },
    }
  }

  // React's autoplay effect: an interval that advances by one and restarts on
  // every change of the index, the interval, the hover state or the prop
  // values `setIdx` closes over (React lists `setIdx` itself as a dependency).
  $effect(() => {
    const current = active
    void index
    void loop
    void count
    if (!autoplayMs || (pauseOnHover && hovered)) return
    const id = setInterval(() => setIdx(current + 1), autoplayMs)
    return () => clearInterval(id)
  })
</script>

<!-- prettier-ignore -->
{#if count > 0}<div
  class={cm.cn(cm.position('relative'), className)}
  use:hoverState={(over): void => {
    hovered = over
  }}
>
  <div style="overflow: hidden"><div style={trackStyle}>{#each items as item, i (i)}<div data-mol-id="carousel-slide" aria-hidden={i === active ? 'false' : 'true'} use:slideStyle={count}>{@render children?.(item, i)}</div>{/each}</div></div>
  {#if showArrows && count > 1}<Button variant="ghost" size="sm" onclick={() => setIdx(active - 1)} aria-label={t('carousel.previous', {}, { defaultValue: 'Previous' })} className={cm.position('absolute')} style={arrowLeftStyle}>‹</Button><Button variant="ghost" size="sm" onclick={() => setIdx(active + 1)} aria-label={t('carousel.next', {}, { defaultValue: 'Next' })} className={cm.position('absolute')} style={arrowRightStyle}>›</Button>{/if}
  {#if showDots && count > 1}<div class={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'xs' }), cm.sp('py', 2))}>{#each Array.from({ length: count }, (_, i) => i) as i (i)}<button type="button" data-mol-id="carousel-dot" data-active={i === active ? 'true' : 'false'} aria-label={t('carousel.goToSlide', { index: i + 1 }, { defaultValue: 'Go to slide {{index}}' })} aria-current={i === active ? 'true' : undefined} onclick={() => setIdx(i)} class={cm.cn(cm.cursorPointer, cm.touchTargetCompact, cm.flex({ align: 'center', justify: 'center' }))} style={dotStyle}><span aria-hidden="true" style={dotFill(i)}></span></button>{/each}</div>{/if}
</div>{/if}
