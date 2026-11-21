/**
 * Angular slide thumbnail tile for presentation editors / slideshow
 * navigators — the counterpart of `@molecule/app-slide-thumbnail-react`: the
 * same props and the same DOM for the same input.
 *
 * Renders a fixed-width clickable tile with an index badge and an
 * "active" outline; the app supplies the scaled-down slide preview as the
 * button's default content.
 *
 * Props: `index` (1-based, required), `active`, `onClick`,
 * `aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
 * default 160), `className`, and the projected preview content.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SlideThumbnail } from '@molecule/app-slide-thumbnail-angular'
 *
 * interface Slide {
 *   id: string
 *   title: string
 * }
 *
 * @Component({
 *   selector: 'app-slide-strip',
 *   standalone: true,
 *   imports: [SlideThumbnail],
 *   template: `
 *     <div style="display: flex; flex-direction: column; gap: 8px">
 *       @for (slide of slides; track slide.id; let i = $index) {
 *         <button
 *           mol-slide-thumbnail
 *           [index]="i + 1"
 *           [active]="i === activeIndex"
 *           [width]="160"
 *           (onClick)="onSelect(i)"
 *         >
 *           <span>{{ slide.title }}</span>
 *         </button>
 *       }
 *     </div>
 *   `,
 * })
 * export class SlideStrip {
 *   slides: Slide[] = []
 *   activeIndex = 0
 *   onSelect(index: number): void {
 *     this.activeIndex = index
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.position('relative')` +
 *   `cm.cursorPointer`) — rendering throws otherwise.
 * - The tile canvas is the theme's surface token (`cm.surface`) and the index
 *   badge sits on a theme scrim (`cm.bgScrim` + `cm.textOnTone`), so both
 *   follow the app's theme — render your own themed preview inside the button.
 * - The active outline uses `currentColor`; set a text color on a parent
 *   to control it.
 * - The index label's aria-label comes from `t('slideThumbnail.label')` with
 *   an English fallback, read through the binding's reactive
 *   `useTranslation()`, so a locale switch updates it at once.
 * - Companion locale bond: `@molecule/app-locales-slide-thumbnail`.
 *
 * @module
 */

export * from './slide-thumbnail.component.js'
export * from './types.js'
