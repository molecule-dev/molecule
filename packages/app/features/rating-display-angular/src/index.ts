/**
 * Angular star-rating display.
 *
 * Exports `RatingDisplay` — fractional star rendering (inline SVG), optional
 * review count tail, optional interactive mode via `onChange`. It is the
 * Angular counterpart of `@molecule/app-rating-display-react`: same props
 * (React names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { RatingDisplay } from '@molecule/app-rating-display-angular'
 *
 * @Component({
 *   selector: 'app-product-rating',
 *   standalone: true,
 *   imports: [RatingDisplay],
 *   template: `
 *     <span
 *       mol-rating-display
 *       [value]="4.5"
 *       [reviewCount]="128"
 *       (click)="scrollToReviews()"
 *     ></span>
 *     <span mol-rating-display [value]="rating()" size="lg" [onChange]="setRating"></span>
 *   `,
 * })
 * export class ProductRating {
 *   readonly rating = signal(0)
 *   readonly setRating = (value: number): void => this.rating.set(value)
 *   scrollToReviews(): void {
 *     document.getElementById('reviews')?.scrollIntoView()
 *   }
 * }
 * ```
 *
 * @remarks
 * The host element IS the outer `<span>` (`span[mol-rating-display]`), exactly
 * as in React. Stars are inline SVG filled with `currentColor` — set a text
 * color on the wrapper (e.g. a warning/amber token) to tint them; unfilled
 * portions render at 25% opacity of the same color. Accessibility labels are
 * English defaults, matching the React package: the container label is
 * overridable via `ariaLabel`, but the per-star "Rate N of M" button labels in
 * interactive mode are not — this package has no locale bond. Requires a wired
 * ClassMap bond.
 *
 * @module
 */

export * from './rating-display.component.js'
export * from './types.js'
