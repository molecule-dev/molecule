/**
 * Image / card carousel.
 *
 * Exports `<Carousel>` — arrows + dots + optional autoplay; controlled-optional.
 *
 * @example
 * ```tsx
 * import { Carousel } from '@molecule/app-carousel-react'
 *
 * <Carousel autoplayMs={4000} showDots showArrows>
 *   <img src="/slides/one.jpg" alt="Slide 1" />
 *   <img src="/slides/two.jpg" alt="Slide 2" />
 *   <img src="/slides/three.jpg" alt="Slide 3" />
 * </Carousel>
 * ```
 *
 * @remarks
 * Controlled-optional: omit `index` for internal state; pass `index` +
 * `onChange` to own it. `autoplayMs={0}` (the default) disables
 * autoplay; autoplay pauses on hover unless `pauseOnHover={false}`.
 * `loop` (default `true`) wraps at the ends. Slides are equal-width
 * children of a translated flex track — give each child its own aspect
 * ratio/height. Translations come from the companion
 * `@molecule/app-locales-carousel` locale bond.
 *
 * @module
 */

export * from './Carousel.js'
