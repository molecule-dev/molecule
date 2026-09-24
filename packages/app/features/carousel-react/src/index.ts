/**
 * Image / card carousel.
 *
 * Exports `<Carousel>` — arrows + dots + optional autoplay; controlled-optional.
 *
 * @example
 * ```tsx
 * import { Carousel } from '@molecule/app-carousel-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as carouselLocales from '@molecule/app-locales-carousel'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(carouselLocales) // arrow + dot aria-labels
 *
 * const slides = [
 *   { src: '/slides/one.jpg', alt: 'Mountain lake at dawn' },
 *   { src: '/slides/two.jpg', alt: 'City skyline at night' },
 *   { src: '/slides/three.jpg', alt: 'Desert dunes' },
 * ]
 *
 * export function Gallery() {
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <Carousel autoplayMs={4000} showDots showArrows>
 *         {slides.map((s) => (
 *           <img key={s.src} src={s.src} alt={s.alt} />
 *         ))}
 *       </Carousel>
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * `children` must be an ARRAY of slides (e.g. `slides.map(...)` or 2+ JSX
 * children): it is typed `ReactNode[]`, and a single child (not an array)
 * crashes on `children.map`. Zero slides render `null`.
 * Controlled-optional: omit `index` for internal state; pass `index` +
 * `onChange` to own it. `autoplayMs` is milliseconds; `0` (the default)
 * disables autoplay; autoplay pauses on hover unless `pauseOnHover={false}`.
 * `loop` (default `true`) wraps at the ends. There is no swipe/drag or
 * keyboard-arrow support — navigation is the arrow and dot buttons only.
 * Slides are equal-width children of a translated flex track — give each
 * child its own aspect ratio/height. It calls `useTranslation()` from
 * `@molecule/app-react` (throws without an `I18nProvider` /
 * `MoleculeProvider i18n` above it) and `getClassMap()` (throws until
 * `setClassMap(...)` ran). Translations come from the companion
 * `@molecule/app-locales-carousel` locale bond.
 *
 * @module
 */

export * from './Carousel.js'
