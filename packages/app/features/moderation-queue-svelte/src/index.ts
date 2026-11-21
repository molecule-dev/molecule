/**
 * Svelte moderation queue UI.
 *
 * Exports `ModerationQueue` — a list of flagged items with kind icon, content
 * preview, reason chip, severity color, per-row action buttons (approve /
 * reject / escalate / mute), and a bulk-select toolbar (select-all checkbox +
 * apply-to-selected action buttons) — and the `severityColor` helper. It is the
 * Svelte counterpart of `@molecule/app-moderation-queue-react`: same props
 * (React names), same DOM for the same input.
 *
 * All user-visible text is i18n'd via the companion locale bond
 * `@molecule/app-locales-moderation-queue`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ModerationQueue } from '@molecule/app-moderation-queue-svelte'
 *
 *   const items = [
 *     {
 *       id: 'r-1',
 *       kind: 'comment',
 *       preview: 'Some flagged comment',
 *       reason: 'Hate speech',
 *       reportedBy: '@alice',
 *       reportedAt: '2 min ago',
 *       severity: 'high',
 *     },
 *   ]
 * </script>
 *
 * <ModerationQueue
 *   {items}
 *   onApprove={(id) => api.approve(id)}
 *   onReject={(id) => api.reject(id)}
 *   onEscalate={(id) => api.escalate(id)}
 *   onMute={(id) => api.mute(id)}
 *   onBulkAction={(action, ids) => api.bulk(action, ids)}
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - Selection state is internal: the component reports a bulk action through
 *   `onBulkAction` and clears the selection afterwards.
 * - Rows are keyed by `item.id` (React's `key={item.id}`), so a row keeps its
 *   DOM node while its id is unchanged and moves with it on a reorder.
 * - Node-valued props (`preview`, `reason`, `reportedBy`, `reportedAt`,
 *   `emptyState`) are snippets or plain strings.
 *
 * @module
 */

export * from './components.js'
export * from './severity.js'
export * from './types.js'
