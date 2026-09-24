/**
 * React contact display.
 *
 * Exports `<ContactDisplay>` — avatar + name + role + email/phone/address with card/row/compact layouts.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ContactDisplay, type ContactFields } from '@molecule/app-contact-display-react'
 *
 * export function TeamList() {
 *   const team: Array<ContactFields & { id: string }> = [
 *     { id: 'jane', name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555 0100', role: 'Product Designer', company: 'Acme Corp' },
 *     { id: 'omar', name: 'Omar Haddad', email: 'omar@example.com', role: 'Engineer', address: '12 Market St, Springfield' },
 *   ]
 *   const [openId, setOpenId] = useState<string | null>(null)
 *   return (
 *     <div>
 *       {team.map(({ id, ...contact }) => (
 *         <ContactDisplay key={id} contact={contact} layout="row" onClick={() => setOpenId(id)} />
 *       ))}
 *       <p>{openId}</p>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `contact.name` is REQUIRED (it also feeds the avatar alt text and initials fallback when
 *   `avatarSrc` is missing). `layout` defaults to `'card'` (stacked); `'compact'` HIDES email,
 *   phone and address — only avatar, name, role and company show.
 * - `contact` fields are display-only data — `email`/`phone` render as `mailto:`/`tel:` links;
 *   there is no formatting/validation. The email/phone/address markers are text glyphs
 *   (✉ ☎ ⌂), not themed SVG icons. `role`, `address`, and `company` accept ReactNodes — pass
 *   translated strings via `t()` where needed.
 * - When `onClick` is provided the whole row becomes clickable (a `<div>`, not a button — no
 *   keyboard focus or role); supply your own keyboard affordance (e.g. wrap in a button/link)
 *   for accessibility-critical surfaces. Put buttons in `actions` instead of nesting them.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup; the avatar is `Avatar` from `@molecule/app-ui-react` (a peer dependency).
 *
 * @module
 */

export * from './ContactDisplay.js'
