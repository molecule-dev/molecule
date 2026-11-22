/**
 * Vendor / seller / agent profile card.
 *
 * Exports `VendorCard` — Avatar/logo + name + tagline + rating/review count
 * + member-since + badges + actions row, on the shared Card. It is the
 * Angular counterpart of `@molecule/app-vendor-card-react`: same props and
 * the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { VendorCard } from '@molecule/app-vendor-card-angular'
 * import { Button } from '@molecule/app-ui-angular'
 *
 * @Component({
 *   selector: 'vendor-page',
 *   standalone: true,
 *   imports: [VendorCard, Button],
 *   template: `
 *     <div mol-vendor-card
 *       name="Acme Supplies"
 *       logoSrc="/logos/acme.png"
 *       description="Industrial parts, fast shipping"
 *       [rating]="4.7"
 *       [reviewCount]="312"
 *       memberSince="Jan 2021"
 *       (click)="openVendorPage()">
 *       <span slot="badges">Verified</span>
 *       <button mol-button size="sm" slot="actions" (click)="follow()">Follow</button>
 *     </div>
 *   `,
 * })
 * export class VendorPage {
 *   readonly openVendorPage = (): void => {
 *     console.log('open vendor page')
 *   }
 *
 *   readonly follow = (): void => {
 *     console.log('follow vendor')
 *   }
 * }
 * ```
 *
 * @remarks
 * Composes `Avatar` from `@molecule/app-ui-angular` on the shared Card
 * surface (`cm.card({ variant: 'elevated' })` + `cm.cardPadding('md')`). The
 * host IS the card's root `<div>`, so a click anywhere on the card fires the
 * host's `(click)` — no keyboard handler or role is added; put primary
 * navigation in `actions` buttons for accessibility. `rating` renders a
 * single ★ plus the number (`toFixed(1)`), not a five-star row;
 * `reviewCount` renders only when `rating` is also set. When `name` is not a
 * plain string the Avatar alt falls back to hardcoded 'Vendor'. All text
 * slots (description, memberSince, badges, actions) are pre-translated — no
 * locale bond. Node props are projected content: `name`, `description`,
 * `memberSince`, `badges` and `actions` are selected by `[slot=<name>]`,
 * everything else binds as inputs. Props (documented on the exported
 * `VendorCardProps` interface): name, logoSrc, description, rating,
 * reviewCount, memberSince, badges, actions, onClick, className.
 *
 * @module
 */

export * from './types.js'
export * from './vendor-card.component.js'
