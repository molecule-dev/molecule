/**
 * Vue notification badge / dot / wrapper.
 *
 * Exports:
 * - `<NotificationBadge>` — count pill with `max+` overflow handling.
 * - `<NotificationDot>` — tiny presence indicator.
 * - `<NotificationWrapper>` — positions a badge at the corner of any child.
 *
 * It is the Vue counterpart of `@molecule/app-notification-badge-react`:
 * same props (React names) and the same DOM for the same input, so an app
 * can switch framework by changing only the package name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import {
 *   NotificationBadge,
 *   NotificationDot,
 *   NotificationWrapper,
 * } from '@molecule/app-notification-badge-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () => [
 *       h(NotificationBadge, { count: 5, variant: 'error' }),
 *       h(NotificationDot, { visible: true, variant: 'info', position: 'corner' }),
 *       h(
 *         NotificationWrapper,
 *         { count: 12, placement: 'top-right' },
 *         { default: () => [h('span', { 'aria-hidden': 'true' }, 'notifications')] },
 *       ),
 *     ]
 *   },
 * })
 *
 * createApp(App).mount('#app')
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
 * `<NotificationWrapper>` absolutely positions the badge 4px OUTSIDE the
 * child's corner — an `overflow: hidden` ancestor will clip it. Its child is
 * the default slot or a `children` prop; both work.
 *
 * @module
 */

export * from './NotificationBadge.js'
export * from './NotificationDot.js'
export * from './NotificationWrapper.js'
export * from './types.js'
