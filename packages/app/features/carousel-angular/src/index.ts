/**
 * Angular image / card carousel — the Angular counterpart of
 * `@molecule/app-carousel-react`: the same props and the same DOM for the same
 * input.
 *
 * Exports `<Carousel>` — arrows + dots + optional autoplay; controlled-optional.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Carousel } from '@molecule/app-carousel-angular'
 *
 * @Component({
 *   selector: 'app-gallery',
 *   standalone: true,
 *   imports: [Carousel],
 *   template: `
 *     <div mol-carousel [autoplayMs]="4000" [showDots]="true" [showArrows]="true">
 *       <img src="/slides/one.jpg" alt="Slide 1" />
 *       <img src="/slides/two.jpg" alt="Slide 2" />
 *       <img src="/slides/three.jpg" alt="Slide 3" />
 *     </div>
 *   `,
 * })
 * export class Gallery {}
 * ```
 *
 * @remarks
 * Controlled-optional: omit `index` for internal state; pass `index` +
 * `onChange` to own it. `autoplayMs={0}` (the default) disables
 * autoplay; autoplay pauses on hover unless `pauseOnHover={false}`.
 * `loop` (default `true`) wraps at the ends. Slides are equal-width
 * children of a translated flex track — give each child its own aspect
 * ratio/height. Slides are the element's projected content: an input cannot
 * carry nodes, so they go inside the host element. Translations come from the
 * companion `@molecule/app-locales-carousel` locale bond.
 *
 * @module
 */

export * from './carousel.component.js'
export * from './types.js'
