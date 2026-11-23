/**
 * Svelte image / card carousel — the Svelte counterpart of
 * `@molecule/app-carousel-react`, with the same DOM for the same input and the
 * slide list passed as data (`items`).
 *
 * Exports `Carousel` — arrows + dots + optional autoplay; controlled-optional.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { Carousel } from '@molecule/app-carousel-svelte'
 *
 *   const slides = [
 *     { src: '/slides/one.jpg', alt: 'Slide 1' },
 *     { src: '/slides/two.jpg', alt: 'Slide 2' },
 *     { src: '/slides/three.jpg', alt: 'Slide 3' },
 *   ]
 * </script>
 *
 * <Carousel items={slides} autoplayMs={4000} showDots showArrows>
 *   {#snippet children(slide)}<img src={slide.src} alt={slide.alt} />{/snippet}
 * </Carousel>
 * ```
 *
 * @remarks
 * Controlled-optional: omit `index` for internal state; pass `index` +
 * `onChange` to own it. `autoplayMs={0}` (the default) disables
 * autoplay; autoplay pauses on hover unless `pauseOnHover={false}`.
 * `loop` (default `true`) wraps at the ends. `items` holds one entry per
 * slide and the `children` snippet renders one entry into its own equal-width
 * frame; give each slide its own aspect ratio/height. Translations come from
 * the companion `@molecule/app-locales-carousel` locale bond.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
