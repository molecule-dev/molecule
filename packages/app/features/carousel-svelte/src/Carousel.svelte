<!--
  Carousel: the Svelte counterpart of `@molecule/app-carousel-react`'s
  `Carousel` — generic image / card carousel with arrows, dots and optional
  autoplay. Same props (React names), same DOM for the same input, same
  callbacks.

  React maps its `children` array to one wrapper `<div>` per slide. A Svelte
  snippet renders its nodes into the live DOM and exposes no count, so the
  wrappers are applied to the rendered nodes in `syncSlides` (an effect): each
  projected node moves into its own wrapper, the count comes from the wrappers,
  and re-running the effect keeps `aria-hidden` current. The children render
  once, at mount — the same single render React gives them.

  The markup is written without whitespace between sibling elements, and is
  `prettier-ignore`d to stay that way: React renders no text nodes between the
  arrows or the dots, while Svelte keeps a template's indentation as text nodes.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { CarouselProps } from './types.js'

  let {
    children,
    index,
    onChange,
    showArrows = true,
    showDots = true,
    autoplayMs = 0,
    pauseOnHover = true,
    loop = true,
    className,
  }: CarouselProps = $props()

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
  /** How many slides the children rendered — React's `children.length`. */
  let count = $state(0)
  /** React's `const active = index ?? internal`. */
  const active = $derived(index ?? internal)

  let root: HTMLElement | undefined = $state()
  let track: HTMLElement | undefined = $state()
  /** The slide wrappers, in rendered order (plain DOM state, not reactive). */
  const wrappers: HTMLElement[] = []
  /** Where the root sat before a no-slides render detached it. */
  let rootParent: Node | null = null

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
   * Wraps each rendered slide in its React wrapper `<div>` and keeps every
   * wrapper's `aria-hidden` and width in step with the active index.
   */
  function syncSlides(): void {
    const el = track
    if (!el) return
    for (const child of Array.from(el.childNodes)) {
      if (wrappers.includes(child as HTMLElement)) continue
      // Svelte anchors a snippet block with comment nodes (React renders none,
      // and the conformance normalizer strips them) and the template's own
      // indentation leaves whitespace-only text nodes beside those anchors.
      if (child.nodeType === Node.COMMENT_NODE) continue
      if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() === '') continue
      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-mol-id', 'carousel-slide')
      el.insertBefore(wrapper, child)
      wrapper.appendChild(child)
      wrappers.push(wrapper)
    }
    const total = wrappers.length
    count = total
    for (const [i, wrapper] of wrappers.entries()) {
      wrapper.setAttribute('aria-hidden', i === active ? 'false' : 'true')
      wrapper.style.width = total === 0 ? '0%' : `${100 / total}%`
      wrapper.style.flexShrink = '0'
    }
    // React returns `null` without slides, so no root element is in the page.
    const host = root
    if (!host) return
    if (total === 0) {
      if (host.isConnected) {
        rootParent = host.parentNode
        host.remove()
      }
    } else if (!host.isConnected && rootParent) {
      rootParent.appendChild(host)
    }
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

  // The slide wrappers, the count and the aria-hidden flags follow the
  // rendered children and the active index.
  $effect(() => {
    void active
    syncSlides()
  })

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
<div
  bind:this={root}
  class={cm.cn(cm.position('relative'), className)}
  use:hoverState={(over): void => {
    hovered = over
  }}
>
  <div style="overflow: hidden"><div bind:this={track} style={trackStyle}>{#if children}{@render children()}{/if}</div></div>
  {#if showArrows && count > 1}<Button variant="ghost" size="sm" onclick={() => setIdx(active - 1)} aria-label={t('carousel.previous', {}, { defaultValue: 'Previous' })} className={cm.position('absolute')} style={arrowLeftStyle}>‹</Button><Button variant="ghost" size="sm" onclick={() => setIdx(active + 1)} aria-label={t('carousel.next', {}, { defaultValue: 'Next' })} className={cm.position('absolute')} style={arrowRightStyle}>›</Button>{/if}
  {#if showDots && count > 1}<div class={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'xs' }), cm.sp('py', 2))}>{#each Array.from({ length: count }, (_, i) => i) as i (i)}<button type="button" data-mol-id="carousel-dot" data-active={i === active ? 'true' : 'false'} aria-label={t('carousel.goToSlide', { index: i + 1 }, { defaultValue: 'Go to slide {{index}}' })} aria-current={i === active ? 'true' : undefined} onclick={() => setIdx(i)} class={cm.cn(cm.cursorPointer, cm.touchTargetCompact, cm.flex({ align: 'center', justify: 'center' }))} style={dotStyle}><span aria-hidden="true" style={dotFill(i)}></span></button>{/each}</div>{/if}
</div>
