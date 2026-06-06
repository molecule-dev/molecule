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
 * @module
 */

export * from './ContactDisplay.js'
