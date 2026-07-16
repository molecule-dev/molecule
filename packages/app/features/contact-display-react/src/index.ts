/**
 * React contact display.
 *
 * Exports `<ContactDisplay>` — avatar + name + role + email/phone/address with card/row/compact layouts.
 *
 * @example
 * ```tsx
 * import { ContactDisplay } from '@molecule/app-contact-display-react'
 *
 * <ContactDisplay
 *   contact={{
 *     name: 'Jane Smith',
 *     email: 'jane@example.com',
 *     phone: '+1 555 0100',
 *     role: 'Product Designer',
 *     company: 'Acme Corp',
 *   }}
 *   layout="row"
 *   onClick={() => openProfile('jane')}
 * />
 * ```
 *
 * @remarks
 * `contact` fields are display-only data — `email`/`phone` render as
 * `mailto:`/`tel:` links; there is no formatting/validation. The email/phone/
 * address markers are text glyphs (✉ ☎ ⌂), not themed SVG icons. `role`,
 * `address`, and `company` accept ReactNodes — pass translated strings via
 * `t()` where needed. When `onClick` is provided the whole row becomes
 * clickable; supply your own keyboard affordance (e.g. wrap in a button/link)
 * for accessibility-critical surfaces.
 *
 * @module
 */

export * from './ContactDisplay.js'
