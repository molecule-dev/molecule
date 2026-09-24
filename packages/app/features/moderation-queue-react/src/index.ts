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
 * import { useState } from 'react'
 *
 * import { type ModerationItem, ModerationQueue } from '@molecule/app-moderation-queue-react'
 *
 * const flagged: ModerationItem[] = [
 *   { id: 'r-1', kind: 'comment', preview: <p>Buy cheap followers here!</p>, reason: 'Spam', reportedBy: '@alice', reportedAt: '2 min ago', severity: 'medium' },
 *   { id: 'r-2', kind: 'post', preview: <p>You are all idiots.</p>, reason: 'Harassment', reportedAt: '1 hour ago', severity: 'high' },
 * ]
 *
 * export function ModerationPage() {
 *   const [items, setItems] = useState(flagged)
 *   const [log, setLog] = useState<string[]>([])
 *   const resolve = (action: string, ids: string[]) => {
 *     setLog((prev) => [...prev, `${action}: ${ids.join(', ')}`]) // call your moderation API here
 *     setItems((prev) => prev.filter((item) => !ids.includes(item.id)))
 *   }
 *   return (
 *     <>
 *       <ModerationQueue
 *         items={items}
 *         onApprove={(id) => resolve('approve', [id])}
 *         onReject={(id) => resolve('reject', [id])}
 *         onEscalate={(id) => resolve('escalate', [id])}
 *         onBulkAction={(action, ids) => resolve(action, ids)}
 *         emptyState={<p>All caught up.</p>}
 *       />
 *       <ul>{log.map((entry) => <li key={entry}>{entry}</li>)}</ul>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs providers.** It calls `useTranslation()` (throws outside an `I18nProvider` from
 *   `@molecule/app-react`) and `getClassMap()` (throws unless `setClassMap(classMap)` from
 *   `@molecule/app-ui` ran at startup, e.g. with `@molecule/app-ui-tailwind`). Buttons come from
 *   `@molecule/app-ui-react` (peer dependency).
 * - It is controlled and does NOT remove handled items or call any API: the callbacks only
 *   report the id(s); drop resolved items from `items` yourself.
 * - `onApprove` and `onReject` are REQUIRED. The Escalate/Mute buttons (row and bulk) render only
 *   when `onEscalate`/`onMute` are passed; the bulk toolbar buttons render only with
 *   `onBulkAction`, which receives `'approve' | 'reject' | 'escalate' | 'mute'` plus the selected
 *   ids and then clears the selection.
 * - `loading` replaces the list with a status row; `emptyState` shows only when `items` is empty.
 * - `severity` maps low/medium/high to info/warning/error colors; omit it to hide the chip.
 *
 * @module
 */

export * from './ModerationQueue.js'
