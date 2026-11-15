/**
 * Vue presence indicator primitives.
 *
 * Exports:
 * - `<PresenceDot>` — small colored status dot (online/away/busy/offline).
 * - `<AvatarWithPresence>` — wraps any avatar and overlays a presence dot.
 * - `PresenceStatus` type.
 *
 * It is the Vue counterpart of `@molecule/app-presence-indicator-react`: the
 * same props (React names), the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { AvatarWithPresence, PresenceDot } from '@molecule/app-presence-indicator-vue'
 *
 * const User = defineComponent({
 *   props: { avatarUrl: String, name: String },
 *   setup(props) {
 *     return () =>
 *       h('div', [
 *         // Inline dot next to a user name
 *         h('span', [props.name, h(PresenceDot, { status: 'online' })]),
 *         // Dot overlaid on an avatar image
 *         h(
 *           AvatarWithPresence,
 *           { status: 'away', corner: 'bottom-right' },
 *           {
 *             default: () => [
 *               h('img', { src: props.avatarUrl, alt: props.name, width: 40, height: 40 }),
 *             ],
 *           },
 *         ),
 *       ])
 *   },
 * })
 * ```
 *
 * @remarks
 * The default aria-label is the English string "Presence: <status>" — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps; the package has no locale
 * bond. `position="overlay"` positions absolutely, so the dot must sit inside
 * a relatively-positioned parent — `<AvatarWithPresence>` provides that
 * wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
 * identical in both themes; the overlay ring color follows
 * `var(--color-surface)`. Node-valued children arrive as the default slot or
 * as a `children` prop; the components accept either.
 *
 * @module
 */

export * from './AvatarWithPresence.js'
export * from './PresenceDot.js'
export * from './types.js'
