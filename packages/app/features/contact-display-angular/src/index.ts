/**
 * Angular formatted contact display — the counterpart of
 * `@molecule/app-contact-display-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<ContactDisplay>` — avatar + name + role + email/phone/address with
 * card/row/compact layouts.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ContactDisplay } from '@molecule/app-contact-display-angular'
 *
 * @Component({
 *   selector: 'app-profile',
 *   standalone: true,
 *   imports: [ContactDisplay],
 *   template: `
 *     <div
 *       mol-contact-display
 *       layout="row"
 *       [contact]="{
 *         name: 'Jane Smith',
 *         email: 'jane@example.com',
 *         phone: '+1 555 0100',
 *         role: 'Product Designer',
 *         company: 'Acme Corp'
 *       }"
 *       (click)="openProfile('jane')"></div>
 *   `,
 * })
 * export class Profile {
 *   openProfile(id: string): void {}
 * }
 * ```
 *
 * @remarks
 * `contact` fields are display-only data — `email`/`phone` render as
 * `mailto:`/`tel:` links; there is no formatting/validation. The email/phone/
 * address markers are text glyphs (✉ ☎ ⌂), not themed SVG icons. `role`,
 * `address`, and `company` are node-valued in React: in Angular pass a
 * `TemplateRef` (rendered through the package's `[molContactNode]` outlet) or
 * plain text. The right-side actions are projected as `[slot=actions]`
 * content. When `onClick` is provided the whole row becomes clickable through
 * a transparent native button covering it, named by the contact name (the
 * name span); the mail/tel links and the `actions` slot sit above that button
 * and keep their own clicks.
 *
 * @module
 */

export * from './contact-display.component.js'
export * from './types.js'
