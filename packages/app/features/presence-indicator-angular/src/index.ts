/**
 * Angular presence indicator primitives — the counterpart of
 * `@molecule/app-presence-indicator-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports:
 * - `<PresenceDot>` — small colored status dot (online/away/busy/offline).
 * - `<AvatarWithPresence>` — wraps any avatar and overlays a presence dot.
 * - `PresenceStatus` type.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AvatarWithPresence, PresenceDot } from '@molecule/app-presence-indicator-angular'
 *
 * @Component({
 *   selector: 'app-user',
 *   standalone: true,
 *   imports: [PresenceDot, AvatarWithPresence],
 *   template: `
 *     <span>{{ name }} <span mol-presence-dot status="online"></span></span>
 *     <span mol-avatar-with-presence status="away" corner="bottom-right">
 *       <img [src]="avatarUrl" [alt]="name" width="40" height="40" />
 *     </span>
 *   `,
 * })
 * export class User {
 *   name = 'Ada'
 *   avatarUrl = '/avatar.png'
 * }
 * ```
 *
 * @remarks
 * The default aria-label is the English string "Presence: <status>" — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps; the package has no locale
 * bond. `position="overlay"` positions absolutely, so the dot must sit inside
 * a relatively-positioned parent — `<AvatarWithPresence>` provides that
 * wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
 * identical in both themes; the overlay ring color follows
 * `var(--color-surface)`. The host element IS the component's root `<span>`;
 * the avatar decorated by `<AvatarWithPresence>` is projected content.
 *
 * @module
 */

export * from './avatar-with-presence.component.js'
export * from './presence-dot.component.js'
export * from './types.js'
