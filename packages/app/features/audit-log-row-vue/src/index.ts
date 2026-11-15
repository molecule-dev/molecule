/**
 * Vue audit / activity / event-log row.
 *
 * Exports `<AuditLogRow>` and the `AuditLogEntry` type — the Vue counterpart
 * of `@molecule/app-audit-log-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { AuditLogRow } from '@molecule/app-audit-log-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(AuditLogRow, {
 *         entry: {
 *           id: 'evt-001',
 *           actor: 'alice@example.com',
 *           action: 'updated',
 *           target: 'Invoice #1042',
 *           timestamp: '2 min ago',
 *           oldValue: 'Draft',
 *           newValue: 'Sent',
 *         },
 *         onClick: () => openDetail('evt-001'),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - `entry` fields are display nodes: pass pre-formatted, translated values.
 *   A Vue node (`vnode`, template ref render) works anywhere a string does.
 * - With `onClick` the row carries `role="button"` + `tabindex="0"` and Enter
 *   / Space activate it, like a native button; without it the row is static.
 *
 * @module
 */

export * from './AuditLogRow.js'
export * from './types.js'
