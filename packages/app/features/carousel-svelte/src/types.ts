/**
 * Types for the Svelte carousel: the same props
 * `@molecule/app-carousel-react`'s `Carousel` accepts (React names), with the
 * slide list as data and node values typed as Svelte snippets.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link Carousel} component. */
export interface CarouselProps<T = unknown> {
  /** The slides, one entry per frame (React's `children` array). */
  items?: T[]
  /** Renders one entry of `items` as its slide. */
  children?: Snippet<[item: T, index: number]>
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
