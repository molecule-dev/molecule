/**
 * Vue image / card carousel.
 *
 * Exports `<Carousel>` — arrows + dots + optional autoplay; controlled-optional.
 * It is the Vue counterpart of `@molecule/app-carousel-react`: the same props
 * and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, h } from 'vue'
 * import { Carousel } from '@molecule/app-carousel-vue'
 *
 * createApp({
 *   render: () =>
 *     h(Carousel, { autoplayMs: 4000, showDots: true, showArrows: true }, {
 *       default: () => [
 *         h('img', { src: '/slides/one.jpg', alt: 'Slide 1' }),
 *         h('img', { src: '/slides/two.jpg', alt: 'Slide 2' }),
 *         h('img', { src: '/slides/three.jpg', alt: 'Slide 3' }),
 *       ],
 *     }),
 * }).mount('#app')
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
export * from './types.js'
