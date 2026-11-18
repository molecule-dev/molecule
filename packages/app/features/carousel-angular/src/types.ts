/**
 * Types of `@molecule/app-carousel-angular` — the Angular counterpart of
 * `@molecule/app-carousel-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link Carousel} — the same props
 * `@molecule/app-carousel-react` accepts. Slides are the element's default
 * projected content (an input cannot carry nodes), so `children` is typed
 * `unknown`: pass the slides inside the host element, not as a value.
 */
export interface CarouselProps {
  /** Slides — each child is one frame, projected as the element's content. */
  children?: unknown
  /** Controlled active index — caller owns state. */
  index?: number
  /** Called when the active index changes. */
  onChange?: (index: number) => void
  /** Show prev/next arrows. Defaults to true. */
  showArrows?: boolean
  /** Show dot indicator strip. Defaults to true. */
  showDots?: boolean
  /** Auto-advance interval in ms (set 0 to disable). */
  autoplayMs?: number
  /** Pause autoplay on mouseover. Defaults to true. */
  pauseOnHover?: boolean
  /** Loop back to start at end. Defaults to true. */
  loop?: boolean
  /** Extra classes. */
  className?: string
}
