/**
 * Vue structured log-row viewer.
 *
 * Exports `<LogViewer>` plus the `LogEntry` / `LogLevel` types. Renders one
 * expandable `<details>` row per entry: timestamp + colored severity badge +
 * service label + single-line message, expanding to a JSON-formatted
 * structured-data panel. Props: `entries`, `onToggle?(id, expanded)`,
 * `emptyState?`, `className?`.
 *
 * Use for operational tooling, admin dashboards, debug views.
 *
 * Vue counterpart of `@molecule/app-log-viewer-react`: the same props (React
 * names) and the same DOM for the same input. Node-valued props accept both a
 * prop and a same-named slot.
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
 * ```ts
 * import { defineComponent, h } from 'vue'
 *
 * import { LogViewer, type LogEntry } from '@molecule/app-log-viewer-vue'
 *
 * const entries: LogEntry[] = [
 *   { id: '1', timestamp: '12:00:01', level: 'info', message: 'Server started', service: 'api' },
 *   { id: '2', timestamp: '12:00:05', level: 'error', message: 'DB connect failed', service: 'db', data: { code: 'ECONNREFUSED' } },
 * ]
 *
 * export const Logs = defineComponent({
 *   setup: () => () =>
 *     h(LogViewer, {
 *       entries,
 *       onToggle: (id: string, open: boolean) => console.log(id, open),
 *     }),
 * })
 * ```
 *
 * @module
 */

export * from './LogViewer.js'
export * from './types.js'
