/**
 * Carousel component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

// Arrow offsets + vertical centering, exactly as React writes them: the
// ClassMap contract exposes no left/right/top or translate resolver (only
// `position` + `inset0`), so the edge offsets and the -50% Y translate that
// centers each arrow are inline — a sanctioned "ClassMap can't express it"
// case. Left arrow pins to the left edge, right arrow to the right edge; both
// sit at the vertical middle.
const ARROW_LEFT_STYLE = { left: '8px', top: '50%', transform: 'translateY(-50%)' }
const ARROW_RIGHT_STYLE = { right: '8px', top: '50%', transform: 'translateY(-50%)' }
// The dot button's hit target is a bare transparent square: the inline
// background/border/padding are native resets, not a competing design, and the
// 8px dot is drawn by the child span.
const DOT_STYLE = 'background: transparent; border: none; padding: 4px'

/**
 * Reads the projected slide nodes out of the track: everything the component
 * has not wrapped yet, in render order.
 *
 * @param track - The flex track element.
 * @param wrappers - The slide wrappers already created, in render order.
 * @returns The nodes still to wrap, in order.
 */
const unwrapped = (track: HTMLElement, wrappers: readonly HTMLElement[]): Node[] =>
  Array.from(track.childNodes).filter(
    (node) =>
      !wrappers.includes(node as HTMLElement) &&
      // Angular anchors structural blocks with comment nodes; React renders
      // none, and the conformance normalizer strips them.
      node.nodeType !== Node.COMMENT_NODE &&
      // The template's indentation can leave whitespace-only text nodes.
      !(node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === ''),
  )

/**
 * Carousel component.
 *
 * Generic image / card carousel with arrows + dots + optional autoplay, fully
 * controlled-optional. The host IS the root `<div>` (`div[mol-carousel]`),
 * matching React's root exactly; the slides are the element's projected
 * content, and each one is moved into its own `[data-mol-id="carousel-slide"]`
 * wrapper — React's per-child wrapper — once the view exists. Same props (React
 * names), same DOM, same `onChange(index)` calls as
 * `@molecule/app-carousel-react`'s `Carousel`. Omit `index` for internal
 * state; pass `index` + `onChange` to own it.
 */
@Component({
  selector: 'div[mol-carousel]',
  standalone: true,
  imports: [Button],
  inputs: [
    'index',
    'onChange',
    'showArrows',
    'showDots',
    'autoplayMs',
    'pauseOnHover',
    'loop',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '(mouseenter)': 'enter()',
    '(mouseleave)': 'leave()',
  },
  // prettier-ignore
  template: `<div style="overflow: hidden"><div #track [style]="trackStyle()"><ng-content></ng-content></div></div>@if (arrowsShown()) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="previous()" [attr.aria-label]="previousLabel()" [className]="absoluteClass()" [style]="arrowLeftStyle">‹</button><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="next()" [attr.aria-label]="nextLabel()" [className]="absoluteClass()" [style]="arrowRightStyle">›</button>}@if (dotsShown()) {<div [class]="dotsClasses()">@for (i of dotIndexes(); track i) {<button type="button" data-mol-id="carousel-dot" [attr.data-active]="i === activeIndex() ? 'true' : 'false'" [attr.aria-label]="goToLabel(i)" [attr.aria-current]="i === activeIndex() ? 'true' : null" (click)="goTo(i)" [class]="dotClasses()" [style]="dotStyle"><span aria-hidden="true" [style]="dotFill(i)"></span></button>}</div>}`,
})
export class Carousel implements AfterViewInit, DoCheck, OnDestroy {
  /** Controlled active index — caller owns state. */
  index?: number
  /** Called when the active index changes. */
  onChange?: (index: number) => void
  /** Show prev/next arrows (defaults to true at read time). */
  showArrows?: boolean
  /** Show dot indicator strip (defaults to true at read time). */
  showDots?: boolean
  /** Auto-advance interval in ms (set 0 to disable). */
  autoplayMs?: number
  /** Pause autoplay on mouseover (defaults to true at read time). */
  pauseOnHover?: boolean
  /** Loop back to start at end (defaults to true at read time). */
  loop?: boolean
  /** Extra classes on the root element. */
  className?: string

  /** The values the arrow Button receives as inputs. */
  readonly arrowLeftStyle: Record<string, string> = ARROW_LEFT_STYLE
  /** The values the arrow Button receives as inputs. */
  readonly arrowRightStyle: Record<string, string> = ARROW_RIGHT_STYLE
  /** The dot button's inline style text. */
  readonly dotStyle = DOT_STYLE

  /** The flex track holding the slide wrappers. */
  @ViewChild('track') private track?: ElementRef<HTMLElement>

  /** The host element — React's root `<div>`. */
  private readonly host = inject(ElementRef<HTMLElement>)

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()

  /** React's `useState(0)`: the uncontrolled active index. */
  private readonly internal = signal(0)
  /** React's `useState(false)`: the pointer-over state autoplay pauses on. */
  private readonly hovered = signal(false)
  /** How many slides the projected content holds — React's `children.length`. */
  private readonly slideCount = signal(0)

  /** The slide wrappers, in render order. */
  private readonly wrappers: HTMLElement[] = []
  /** Where the host sat before a no-slides render detached it. */
  private hostParent: Node | null = null
  /** The autoplay interval, and the dependency key it was started for. */
  private timer: ReturnType<typeof setInterval> | null = null
  private timerKey = ''
  /** The slide count whose publication is queued for after the current check. */
  private pendingCount = -1

  constructor() {
    // Every wrapper's `aria-hidden` and width follow the active index, as
    // React's render does — a signal effect, so a targeted (zoneless) update
    // that re-evaluates the template bindings runs it too.
    effect(() => {
      this.syncWrappers()
    })

    // React's autoplay effect: an interval that advances by one and restarts on
    // every change of the index, the interval, the hover state or the prop
    // values `setIdx` closes over (React lists `setIdx` itself as a dependency).
    // A prop is a plain input, so a change reaches `syncTimer` through the
    // check that wrote it (see `ngDoCheck`); the signals this effect reads —
    // the active index, the hover state and the slide count — re-run it here.
    effect(() => {
      this.activeIndex()
      this.hovered()
      this.slideCount()
      this.syncTimer()
    })
  }

  /**
   * Mirrors React's effect dependency list onto the autoplay interval: it
   * restarts whenever the interval, the pause setting, the hover state, the
   * slide count, the active index or the `setIdx` inputs change.
   */
  ngDoCheck(): void {
    this.wrapSlides()
    this.syncWrappers()
    this.syncTimer()
  }

  /** Clears the autoplay interval when the component is destroyed. */
  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /**
   * Keeps every slide wrapper's `aria-hidden` and width on the active index —
   * React's per-child attributes, which the template cannot bind because the
   * wrappers are React's, not the template's.
   */
  private syncWrappers(): void {
    const active = this.activeIndex()
    const total = this.slideCount()
    for (const [i, wrapper] of this.wrappers.entries()) {
      wrapper.setAttribute('aria-hidden', i === active ? 'false' : 'true')
      wrapper.style.width = total === 0 ? '0%' : `${100 / total}%`
      wrapper.style.flexShrink = '0'
    }
  }

  /**
   * Starts, restarts or clears the autoplay interval for the current inputs —
   * React's autoplay effect, driven by {@link ngDoCheck} for plain inputs and by
   * a signal effect for state.
   */
  private syncTimer(): void {
    const autoplayMs = this.autoplayMs ?? 0
    const pauseOnHover = this.pauseOnHover ?? true
    const total = this.slideCount()
    const current = this.activeIndex()
    const key = [
      autoplayMs,
      pauseOnHover,
      this.hovered(),
      total,
      current,
      this.index === undefined,
      this.loop ?? true,
    ].join('|')
    if (key === this.timerKey) return
    this.timerKey = key
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (!autoplayMs || total === 0 || (pauseOnHover && this.hovered())) return
    this.timer = setInterval(() => this.setIdx(current + 1), autoplayMs)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * React's `const active = index ?? internal`.
   * @returns The active slide index.
   */
  activeIndex(): number {
    return this.index ?? this.internal()
  }

  /**
   * Computes the root class list (React's `cm.position('relative')` plus the
   * extra `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * The arrows' extra class (React's `cm.position('absolute')`).
   * @returns The class string.
   */
  absoluteClass(): string {
    return this.cm().position('absolute')
  }

  /**
   * React's `showArrows = true` default, gated on more than one slide.
   * @returns Whether the arrows render.
   */
  arrowsShown(): boolean {
    return (this.showArrows ?? true) && this.slideCount() > 1
  }

  /**
   * React's `showDots = true` default, gated on more than one slide.
   * @returns Whether the dot strip renders.
   */
  dotsShown(): boolean {
    return (this.showDots ?? true) && this.slideCount() > 1
  }

  /**
   * The translated previous-arrow label.
   * @returns The accessible name.
   */
  previousLabel(): string {
    return this.i18n.t('carousel.previous', {}, { defaultValue: 'Previous' })
  }

  /**
   * The translated next-arrow label.
   * @returns The accessible name.
   */
  nextLabel(): string {
    return this.i18n.t('carousel.next', {}, { defaultValue: 'Next' })
  }

  /**
   * The translated label of one dot.
   * @param i - The dot's slide index.
   * @returns The accessible name.
   */
  goToLabel(i: number): string {
    return this.i18n.t(
      'carousel.goToSlide',
      { index: i + 1 },
      { defaultValue: 'Go to slide {{index}}' },
    )
  }

  /**
   * The dot strip's class list (React's flex row + `cm.sp('py', 2)`).
   * @returns The class string.
   */
  dotsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center', gap: 'xs' }),
      this.cm().sp('py', 2),
    )
  }

  /**
   * One dot button's class list.
   * @returns The class string.
   */
  dotClasses(): string {
    return this.cm().cn(
      this.cm().cursorPointer,
      this.cm().touchTargetCompact,
      this.cm().flex({ align: 'center', justify: 'center' }),
    )
  }

  /**
   * The one dot glyph's inline style: React's 8px circle in the active or
   * inactive theme token.
   * @param i - The dot's slide index.
   * @returns The declaration string.
   */
  dotFill(i: number): string {
    // Theme tokens: the inactive dot was `rgba(0,0,0,0.2)`, which is invisible
    // on a dark surface.
    const background =
      i === this.activeIndex()
        ? 'var(--mol-color-primary, currentColor)'
        : 'var(--mol-color-border, rgba(128,128,128,0.4))'
    return `display: block; width: 8px; height: 8px; border-radius: 50%; background: ${background}`
  }

  /**
   * The track's inline style — React's flex track, translated to the active
   * slide.
   * @returns The declaration string.
   */
  trackStyle(): string {
    const total = this.slideCount()
    const shift = total === 0 ? 0 : (this.activeIndex() / total) * 100
    return `display: flex; width: ${total * 100}%; transform: translateX(-${shift}%); transition: transform 250ms ease`
  }

  /**
   * The dot indices, in order (React's `children.map((_, i) => …)`).
   * @returns The indices `0 … slideCount - 1`.
   */
  dotIndexes(): number[] {
    return Array.from({ length: this.slideCount() }, (_, i) => i)
  }

  /** Records the pointer entering the carousel. */
  enter(): void {
    this.hovered.set(true)
  }

  /** Records the pointer leaving the carousel. */
  leave(): void {
    this.hovered.set(false)
  }

  /** Moves one slide back. */
  previous(): void {
    this.setIdx(this.activeIndex() - 1)
  }

  /** Moves one slide forward. */
  next(): void {
    this.setIdx(this.activeIndex() + 1)
  }

  /**
   * Jumps to one slide.
   * @param i - The destination index.
   */
  goTo(i: number): void {
    this.setIdx(i)
  }

  /**
   * Moves to an index, clamping or wrapping exactly as React's `setIdx` does,
   * then reports the clamped value through `onChange` (also when controlled).
   * @param index - The requested index.
   */
  setIdx(index: number): void {
    const total = this.slideCount()
    const clamped =
      (this.loop ?? true) ? (index + total) % total : Math.max(0, Math.min(total - 1, index))
    if (this.index === undefined) this.internal.set(clamped)
    this.onChange?.(clamped)
  }

  /**
   * Wraps the projected slides once the view (and its track query) exists —
   * the projected content is created with the view, and a zoneless app does not
   * re-check a clean view.
   */
  ngAfterViewInit(): void {
    this.wrapSlides()
  }

  /**
   * Wraps every projected slide that is not wrapped yet, keeps the host element
   * to React's rule (no element at all without slides) and publishes the count.
   * Idempotent: the first check wraps, later checks only reconcile.
   */
  private wrapSlides(): void {
    const track = this.track?.nativeElement
    if (track) {
      for (const node of unwrapped(track, this.wrappers)) {
        const wrapper = document.createElement('div')
        wrapper.setAttribute('data-mol-id', 'carousel-slide')
        track.insertBefore(wrapper, node)
        wrapper.appendChild(node)
        this.wrappers.push(wrapper)
      }
    }
    const host = this.host.nativeElement
    if (this.wrappers.length === 0) {
      if (host.isConnected) {
        this.hostParent = host.parentNode
        host.remove()
      }
    } else if (!host.isConnected && this.hostParent) {
      this.hostParent.appendChild(host)
    }
    this.publishCount(this.wrappers.length)
  }

  /**
   * Publishes the slide count after the current check when it changed: the
   * projected content exists only after the view is created, and a write during
   * this check would change a binding the check already read.
   *
   * @param total - The count read from the rendered wrappers.
   */
  private publishCount(total: number): void {
    if (total === this.slideCount() || total === this.pendingCount) return
    this.pendingCount = total
    queueMicrotask(() => {
      this.pendingCount = -1
      this.slideCount.set(total)
    })
  }
}
