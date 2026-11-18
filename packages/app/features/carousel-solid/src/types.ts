/**
 * Types for the Solid carousel: the same props
 * `@molecule/app-carousel-react`'s `Carousel` accepts (React names), with node
 * values typed as Solid's.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link Carousel} component. */
export interface CarouselProps {
  /** Slides — each child is one frame. */
  children?: JSX.Element
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
