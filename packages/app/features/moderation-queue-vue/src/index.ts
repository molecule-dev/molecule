/**
 * Vue moderation queue UI.
 *
 * Exports `<ModerationQueue>` — a list of flagged items with kind icon,
 * content preview, reason chip, severity color, per-row action buttons
 * (approve / reject / escalate / mute), and a bulk-select toolbar
 * (select-all checkbox + apply-to-selected action buttons). It is the Vue
 * counterpart of `@molecule/app-moderation-queue-react`: same props (React
 * names), same DOM for the same input.
 *
 * All user-visible text is i18n'd via the companion locale bond
 * `@molecule/app-locales-moderation-queue`.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ModerationQueue, type ModerationItem } from '@molecule/app-moderation-queue-vue'
 *
 * const items: ModerationItem[] = [
 *   {
 *     id: 'r-1',
 *     kind: 'comment',
 *     preview: h('p', 'Some flagged comment'),
 *     reason: 'Hate speech',
 *     reportedBy: '@alice',
 *     reportedAt: '2 min ago',
 *     severity: 'high',
 *   },
 * ]
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ModerationQueue, {
 *         items,
 *         onApprove: (id) => api.approve(id),
 *         onReject: (id) => api.reject(id),
 *         onEscalate: (id) => api.escalate(id),
 *         onMute: (id) => api.mute(id),
 *         onBulkAction: (action, ids) => api.bulk(action, ids),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - Selection state is internal (React's `useState`): the component reports a
 *   bulk action through `onBulkAction` and clears the selection afterwards.
 * - Node-valued item fields (`preview`, `reason`, `reportedBy`, `reportedAt`)
 *   and `emptyState` take VNodes or plain text.
 *
 * @module
 */

export * from './ModerationQueue.js'
export * from './types.js'
