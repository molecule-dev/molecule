/**
 * Svelte presence indicator primitives — the Svelte counterpart of
 * `@molecule/app-presence-indicator-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports:
 * - `PresenceDot` — small colored status dot (online/away/busy/offline).
 * - `AvatarWithPresence` — wraps any avatar and overlays a presence dot.
 * - `PresenceStatus` type.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AvatarWithPresence, PresenceDot } from '@molecule/app-presence-indicator-svelte'
 *
 *   const user = { avatarUrl: '/avatar.png', name: 'Ada' }
 * </script>
 *
 * <!-- Inline dot next to a user name -->
 * <span>{user.name} <PresenceDot status="online" /></span>
 *
 * <!-- Dot overlaid on an avatar image -->
 * <AvatarWithPresence status="away" corner="bottom-right">
 *   <img src={user.avatarUrl} alt={user.name} width={40} height={40} />
 * </AvatarWithPresence>
 * ```
 *
 * @remarks
 * The default aria-label is the English string "Presence: <status>" — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps; the package has no locale
 * bond. `position="overlay"` positions absolutely, so the dot must sit inside
 * a relatively-positioned parent — `AvatarWithPresence` provides that
 * wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
 * identical in both themes; the overlay ring color follows
 * `var(--color-surface)`. The decorated avatar is the default `children`
 * snippet; a node prop (the React form) may also arrive as a same-named
 * snippet.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
