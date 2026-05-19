/**
 * Moderation queue UI for React.
 *
 * Renders a list of flagged items with kind icon, content preview,
 * reason chip, severity color, per-row action buttons (approve /
 * reject / escalate / mute), and a bulk-select toolbar
 * (select-all checkbox + apply-to-selected actions).
 *
 * All user-visible text is i18n'd via the companion locale bond
 * `@molecule/app-locales-moderation-queue`.
 *
 * @example
 * ```tsx
 * import { ModerationQueue, type ModerationItem } from '@molecule/app-moderation-queue-react'
 *
 * const items: ModerationItem[] = [
 *   {
 *     id: 'r-1',
 *     kind: 'comment',
 *     preview: <p>Some flagged comment</p>,
 *     reason: 'Hate speech',
 *     reportedBy: '@alice',
 *     reportedAt: '2 min ago',
 *     severity: 'high',
 *   },
 * ]
 *
 * <ModerationQueue
 *   items={items}
 *   onApprove={(id) => api.approve(id)}
 *   onReject={(id) => api.reject(id)}
 *   onEscalate={(id) => api.escalate(id)}
 *   onMute={(id) => api.mute(id)}
 *   onBulkAction={(action, ids) => api.bulk(action, ids)}
 * />
 * ```
 *
 * @module
 */

export * from './ModerationQueue.js'
