/**
 * Structured log-row viewer.
 *
 * Exports `<LogViewer>` and `LogEntry` / `LogLevel` types.
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
