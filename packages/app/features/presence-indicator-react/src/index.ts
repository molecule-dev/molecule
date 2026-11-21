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
 * const user = { avatarUrl: '/avatar.png', name: 'Ada' }
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
 * @remarks
 * The default aria-label resolves through `t('presenceIndicator.aria.presence',
 * { status })` with the status word translated per `presenceIndicator.status.*`
 * key (companion bond `@molecule/app-locales-presence-indicator`), so it follows
 * the active locale; pass `ariaLabel` (e.g. from `t()`) to override it.
 * `position="overlay"` positions absolutely, so the dot must sit inside
 * a relatively-positioned parent — `<AvatarWithPresence>` provides that
 * wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
 * identical in both themes; the overlay ring color follows
 * `var(--color-surface)`.
 *
 * @module
 */

export * from './AvatarWithPresence.js'
export * from './PresenceDot.js'
