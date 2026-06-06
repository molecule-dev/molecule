/**
 * Presence indicator primitives.
 *
 * Exports:
 * - `<PresenceDot>` — small colored status dot (online/away/busy/offline).
 * - `<AvatarWithPresence>` — wraps any avatar and overlays a presence dot.
 * - `PresenceStatus` type.
 *
 * @example
 * ```tsx
 * import { PresenceDot, AvatarWithPresence } from '@molecule/app-presence-indicator-react'
 *
 * // Inline dot next to a user name
 * <PresenceDot status="online" />
 *
 * // Dot overlaid on an avatar image
 * <AvatarWithPresence status="away" corner="bottom-right">
 *   <img src={user.avatarUrl} alt={user.name} width={40} height={40} />
 * </AvatarWithPresence>
 * ```
 *
 * @module
 */

export * from './AvatarWithPresence.js'
export * from './PresenceDot.js'
