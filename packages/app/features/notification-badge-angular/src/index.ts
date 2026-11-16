/**
 * Angular notification badge / dot / wrapper — the counterpart of
 * `@molecule/app-notification-badge-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports:
 * - `<NotificationBadge>` (`span[mol-notification-badge]`) — count pill with
 *   `max+` overflow handling.
 * - `<NotificationDot>` (`span[mol-notification-dot]`) — tiny presence
 *   indicator.
 * - `<NotificationWrapper>` (`span[mol-notification-wrapper]`) — positions a
 *   badge at the corner of any child.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   NotificationBadge,
 *   NotificationDot,
 *   NotificationWrapper,
 * } from '@molecule/app-notification-badge-angular'
 *
 * @Component({
 *   selector: 'app-inbox',
 *   standalone: true,
 *   imports: [NotificationBadge, NotificationDot, NotificationWrapper],
 *   template: `
 *     <span mol-notification-badge [count]="5" variant="error"></span>
 *
 *     <span mol-notification-dot [visible]="true" variant="info" position="corner"></span>
 *
 *     <span mol-notification-wrapper [count]="12" placement="top-right">
 *       <span aria-hidden>notifications</span>
 *     </span>
 *   `,
 * })
 * export class Inbox {}
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * Every variant resolves to a real theme background token, so all five are
 * visible in both light and dark themes: `error` / `warning` / `info` /
 * `success` map to the semantic status colors, and `neutral` maps to the
 * `surface-secondary` surface token (what `cm.surfaceSecondary` emits) for a
 * neutral grey fill.
 *
 * Node props are projected content in Angular: the wrapper's child is its
 * default projection, not an input. `<NotificationWrapper>` absolutely
 * positions the badge 4px OUTSIDE the child's corner — an `overflow: hidden`
 * ancestor will clip it.
 *
 * @module
 */

export * from './notification-badge.component.js'
export * from './notification-dot.component.js'
export * from './notification-wrapper.component.js'
export * from './types.js'
