/**
 * Angular product / property / listing card primitives.
 *
 * Exports:
 * - `<ListingCard>` — outer Card shell (`div[mol-listing-card]`). Props:
 *   `onClick?`, `className?`, `dataMolId?`; children are projected content.
 * - `<ListingCardMedia>` — top image slot (`div[mol-listing-card-media]`).
 *   Props: `src?`, `alt?`, node children (custom media node), `aspect?`
 *   (`'1/1' | '4/3' | '16/9' | '3/2'`, default `'4/3'`, applied as an inline
 *   aspect-ratio style), `overlay?` (`[slot=overlay]`, absolutely positioned
 *   over the media), `className?`.
 * - `<ListingCardBody>` — stacked text (`div[mol-listing-card-body]`). Props:
 *   `title`, `subtitle?`, `price?`, `meta?`, `className?`.
 * - `<ListingCardActions>` — action row (`div[mol-listing-card-actions]`).
 *   Props: node children, `layout?` (`'horizontal'` default | `'stacked'`),
 *   `className?`.
 * - `<ListingGrid>` — grid container (`div[mol-listing-grid]`). Props: node
 *   children, `columns?` (1–6, default 3), `gap?`, `className?`.
 *
 * This is the Angular counterpart of `@molecule/app-listing-card-react`: the
 * same exports, the same props (React names) and the same DOM for the same
 * input. Node props are projected content — `[slot=<name>]` for the named ones
 * and default content for `children`.
 *
 * @remarks
 * - `ListingCard`'s `(click)` handler is attached to the WHOLE card — clicks on
 *   buttons inside `<ListingCardActions>` bubble into it. Call
 *   `event.stopPropagation()` in every action handler (as in the example) or
 *   the card navigation fires too.
 * - `ListingGrid` renders a fixed `columns`-column grid (via `cm.grid`);
 *   override `className` for a custom grid.
 * - `overlay` content is rendered inside an absolutely-positioned inset-0
 *   layer; give interactive overlays their own pointer handling and
 *   stopPropagation.
 * - Styling resolves through `getClassMap()`; the shell reproduces `<Card>`'s
 *   classes from `@molecule/app-ui` — wire a ClassMap bond first.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   ListingCard,
 *   ListingCardActions,
 *   ListingCardBody,
 *   ListingCardMedia,
 *   ListingGrid,
 * } from '@molecule/app-listing-card-angular'
 *
 * @Component({
 *   selector: 'app-listings',
 *   standalone: true,
 *   imports: [ListingCard, ListingCardActions, ListingCardBody, ListingCardMedia, ListingGrid],
 *   template: `
 *     <div mol-listing-grid [columns]="3">
 *       <div mol-listing-card [onClick]="open(item.id)">
 *         <div mol-listing-card-media [src]="item.imageUrl" aspect="4/3" [alt]="item.name"></div>
 *         <div mol-listing-card-body
 *              [title]="item.name"
 *              [subtitle]="item.location"
 *              [price]="'$' + item.price + '/night'"></div>
 *         <div mol-listing-card-actions>
 *           <button
 *             type="button"
 *             (click)="$event.stopPropagation(); save(item.id)"
 *           >
 *             Save
 *           </button>
 *         </div>
 *       </div>
 *     </div>
 *   `,
 * })
 * export class Listings {
 *   items: Listing[] = []
 *   open(id: string): () => void {
 *     return () => this.navigate(`/listings/${id}`)
 *   }
 * }
 * ```
 *
 * @module
 */

export * from './listing-card.component.js'
export * from './listing-card-actions.component.js'
export * from './listing-card-body.component.js'
export * from './listing-card-media.component.js'
export * from './listing-grid.component.js'
export * from './types.js'
