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
 * - `data` is pretty-printed with `JSON.stringify(…, null, 2)`; strings render
 *   verbatim. Large payloads scroll horizontally inside the panel.
 *
 * @example
 * ```tsx
 * import { LogViewer } from '@molecule/app-log-viewer-react'
 * import type { LogEntry } from '@molecule/app-log-viewer-react'
 *
 * const entries: LogEntry[] = [
 *   { id: '1', timestamp: '12:00:01', level: 'info', message: 'Server started', service: 'api' },
 *   { id: '2', timestamp: '12:00:05', level: 'error', message: 'DB connect failed', service: 'db', data: { code: 'ECONNREFUSED' } },
 * ]
 *
 * <LogViewer entries={entries} onToggle={(id, open) => console.log(id, open)} />
 * ```
 *
 * @module
 */

export * from './LogViewer.js'
