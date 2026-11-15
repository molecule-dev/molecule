/**
 * Angular structured log viewer — the counterpart of
 * `@molecule/app-log-viewer-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<LogViewer>` — one expandable `<details>` row per entry:
 * timestamp + colored severity badge + service label + single-line message,
 * expanding to a JSON-formatted structured-data panel. Props: `entries`,
 * `onToggle?(id, expanded)`, `emptyState` (projected as
 * `[slot=emptyState]`), `className`.
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
 * ```ts
 * import { Component } from '@angular/core'
 * import { LogViewer, type LogEntry } from '@molecule/app-log-viewer-angular'
 *
 * @Component({
 *   selector: 'app-logs',
 *   standalone: true,
 *   imports: [LogViewer],
 *   template: `
 *     <mol-log-viewer [entries]="entries" [onToggle]="onToggle">
 *       <p slot="emptyState">No logs yet.</p>
 *     </mol-log-viewer>
 *   `,
 * })
 * export class Logs {
 *   entries: LogEntry[] = [
 *     { id: '1', timestamp: '12:00:01', level: 'info', message: 'Server started', service: 'api' },
 *   ]
 *   onToggle = (id: string, open: boolean): void => console.log(id, open)
 * }
 * ```
 *
 * @module
 */

export * from './log-viewer.component.js'
export * from './types.js'
