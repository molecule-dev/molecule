/**
 * Structured log-row viewer.
 *
 * Exports `<LogViewer>` plus the `LogEntry` / `LogLevel` types. Renders one
 * expandable `<details>` row per entry: timestamp + colored severity badge +
 * service label + single-line message, expanding to a JSON-formatted
 * structured-data panel. Props: `entries`, `onToggle?(id, expanded)`,
 * `emptyState?`, `className?`.
 *
 * Use for operational tooling, admin dashboards, debug views.
 *
 * @remarks
 * - Expansion state is internal; `onToggle` is notification-only — there is no
 *   controlled expanded-ids prop.
 * - The timestamp column is a fixed 48px box: pass short pre-formatted times
 *   (e.g. `HH:mm:ss`), not full ISO strings, or they overflow.
 * - Severity badges use a fixed hex palette with white text (trace grey → fatal
 *   dark red) that does not follow the app theme; the level name renders raw and
 *   uppercased (not localized).
 * - It does NOT fetch, filter, search, sort or tail logs — pass the already-filtered, ordered
 *   `entries`. `level` must be one of `trace | debug | info | warn | error | fatal` (map
 *   `warning` → `warn` yourself; an unknown level gets no badge color).
 * - `traceId` renders in the always-visible summary row, NOT in the expanded panel; only
 *   `data` is behind the expander, and entries without `data` expand to nothing.
 * - `emptyState` renders INSTEAD of the `role="log"` container when `entries` is empty.
 * - Styling resolves through `getClassMap()`, which throws unless `setClassMap(classMap)` from
 *   `@molecule/app-ui` ran at startup.
 * - `data` is pretty-printed with `JSON.stringify(…, null, 2)`; strings render
 *   verbatim. Large payloads scroll horizontally inside the panel.
 *
 * @example
 * ```tsx
 * import { type LogEntry, type LogLevel, LogViewer } from '@molecule/app-log-viewer-react'
 *
 * const records = [
 *   { id: '1', at: '2026-09-24T12:00:01.000Z', level: 'info', msg: 'Server started', service: 'api' },
 *   { id: '2', at: '2026-09-24T12:00:05.000Z', level: 'error', msg: 'DB connect failed', service: 'db', requestId: 'req-42', detail: { code: 'ECONNREFUSED', port: 5432 } },
 * ]
 *
 * export function ServiceLogs() {
 *   const entries: LogEntry[] = records.map((r) => ({
 *     id: r.id,
 *     timestamp: r.at.slice(11, 19), // short HH:mm:ss — the time column is only 48px wide
 *     level: r.level as LogLevel,
 *     message: r.msg,
 *     service: r.service,
 *     traceId: r.requestId,
 *     data: r.detail,
 *   }))
 *   return <LogViewer entries={entries} emptyState={<p>No log entries yet.</p>} />
 * }
 * ```
 *
 * @module
 */

export * from './LogViewer.js'
