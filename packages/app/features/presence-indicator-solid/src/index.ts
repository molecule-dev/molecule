/**
 * Solid presence indicator primitives.
 *
 * Exports:
 * - `PresenceDot` — small colored status dot (online/away/busy/offline).
 * - `AvatarWithPresence` — wraps any avatar and overlays a presence dot.
 * - `PresenceStatus` type.
 *
 * It is the Solid counterpart of `@molecule/app-presence-indicator-react`: the
 * same props (React names), the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { AvatarWithPresence, PresenceDot } from '@molecule/app-presence-indicator-solid'
 *
 * const user = { avatarUrl: '/avatar.png', name: 'Ada' }
 *
 * export function User() {
 *   // Inline dot next to a user name
 *   const inline = (
 *     <span>
 *       {user.name} <PresenceDot status="online" />
 *     </span>
 *   )
 *   // Dot overlaid on an avatar image
 *   return (
 *     <div>
 *       {inline}
 *       <AvatarWithPresence status="away" corner="bottom-right">
 *         <img src={user.avatarUrl} alt={user.name} width={40} height={40} />
 *       </AvatarWithPresence>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * The default aria-label is the English string "Presence: <status>" — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps; the package has no locale
 * bond. `position="overlay"` positions absolutely, so the dot must sit inside
 * a relatively-positioned parent — `AvatarWithPresence` provides that
 * wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
 * identical in both themes; the overlay ring color follows
 * `var(--color-surface)`.
 *
 * @module
 */

export * from './AvatarWithPresence.jsx'
export * from './PresenceDot.jsx'
export * from './types.js'
