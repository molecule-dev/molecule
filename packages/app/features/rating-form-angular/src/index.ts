/**
 * Angular interactive star-rating + comment form — the counterpart of
 * `@molecule/app-rating-form-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<RatingForm>` — a star radiogroup, a comment textarea and a submit
 * button.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { RatingForm } from '@molecule/app-rating-form-angular'
 *
 * @Component({
 *   selector: 'app-review',
 *   standalone: true,
 *   imports: [RatingForm],
 *   template: `
 *     <form
 *       mol-rating-form
 *       title="Leave a review"
 *       submitLabel="Submit review"
 *       [onSubmit]="submitReview"
 *     ></form>
 *   `,
 * })
 * export class Review {
 *   submitReview = (rating: number, comment: string): Promise<void> =>
 *     api.submitReview({ rating, comment })
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-rating-form`. The submit button
 * stays disabled until a star rating is selected, and `requireComment` blocks
 * submission on blank comments silently (no inline error is rendered). Rejected
 * `onSubmit` promises propagate — handle errors in your handler. Requires a
 * bonded ClassMap and `@molecule/app-angular`'s i18n provider above it.
 *
 * @module
 */

export * from './rating-form.component.js'
export * from './types.js'
