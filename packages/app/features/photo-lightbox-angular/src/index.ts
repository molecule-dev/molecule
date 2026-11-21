/**
 * Angular fullscreen photo viewer — the counterpart of
 * `@molecule/app-photo-lightbox-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `PhotoLightbox` (modal overlay with prev/next arrows, keyboard
 * navigation via ArrowLeft / ArrowRight / Escape, backdrop-click close,
 * optional captions, and an "N / total" counter) and the `LightboxPhoto` type.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { PhotoLightbox, type LightboxPhoto } from '@molecule/app-photo-lightbox-angular'
 *
 * @Component({
 *   selector: 'app-gallery',
 *   standalone: true,
 *   imports: [PhotoLightbox],
 *   template: `
 *     <div
 *       mol-photo-lightbox
 *       [photos]="photos"
 *       [open]="open()"
 *       [initialIndex]="index()"
 *       (onClose)="open.set(false)"
 *       (onIndexChange)="index.set($event)"
 *     ></div>
 *   `,
 * })
 * export class Gallery {
 *   readonly photos: LightboxPhoto[] = [
 *     { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
 *     { src: '/images/photo2.jpg', alt: 'Valley below' },
 *   ]
 *   readonly open = signal(false)
 *   readonly index = signal(0)
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-photo-lightbox` (keys
 * `lightbox.close` / `lightbox.previous` / `lightbox.next`). The overlay is
 * `position: fixed` at `z-index: 100` with a near-black backdrop in both
 * themes; it does NOT lock body scroll while open. Requires the app-angular i18n
 * provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './photo-lightbox.component.js'
export * from './types.js'
