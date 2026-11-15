/**
 * Solid structured log viewer: one expandable `<details>` row per entry —
 * timestamp + colored severity badge + optional service label + single-line
 * message, expanding to a trace id and a JSON-formatted structured-data panel.
 *
 * Solid counterpart of `@molecule/app-log-viewer-react`'s `LogViewer` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { LogEntry, LogLevel, LogViewerProps } from './types.js'

/** Severity badge colors: trace grey → fatal dark red (fixed, not themed). */
const LEVEL_COLOR: Record<LogLevel, string> = {
  trace: '#94a3b8',
  debug: '#60a5fa',
  info: '#22c55e',
  warn: '#eab308',
  error: '#ef4444',
  fatal: '#b91c1c',
}

/**
 * The text a structured-data panel renders: strings verbatim, anything else
 * pretty-printed with `JSON.stringify(…, null, 2)` (React's shape).
 *
 * @param data - The entry's structured data.
 * @returns The panel text.
 */
const dataText = (data: unknown): string =>
  typeof data === 'string' ? data : JSON.stringify(data, null, 2)

/**
 * Structured log list — one `<details>` per entry with timestamp + level badge
 * + service label + single-line message, expanding to show trace id +
 * JSON-formatted structured data.
 *
 * Rows are keyed by `entry.id` (React's `key={e.id}`): a stable record per id
 * keeps a row's DOM node while its id is unchanged, so a re-passed equal list
 * does not re-create the rows.
 *
 * Use for operational tooling, admin dashboards, debug views.
 *
 * @param props - Component props (see {@link LogViewerProps}).
 * @returns The rendered log viewer.
 */
export const LogViewer: Component<LogViewerProps> = (props) => {
  const cm = getClassMap()
  const [openIds, setOpenIds] = createSignal<Set<string>>(new Set())

  /**
   * Whether the entry with the given id is expanded.
   *
   * @param id - The entry id.
   * @returns True when expanded.
   */
  const isOpen = (id: string): boolean => openIds().has(id)

  /**
   * Toggles the expanded state of the entry with the given id, then notifies
   * `onToggle` with the new state (React's `toggle`).
   *
   * @param id - The entry id.
   */
  const toggle = (id: string): void => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      props.onToggle?.(id, next.has(id))
      return next
    })
  }

  /** One stable record per entry id, so `<For>` keys rows by id like React. */
  const records = new Map<string, { id: string }>()

  /**
   * The current rows, each a stable record for its entry id.
   *
   * @returns One record per entry, in order.
   */
  const keyedRows = (): { id: string }[] => {
    const seen = new Set<string>()
    const rows = props.entries.map((entry) => {
      seen.add(entry.id)
      let row = records.get(entry.id)
      if (!row) {
        row = { id: entry.id }
        records.set(entry.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current entry for a row id.
   *
   * @param id - The entry id.
   * @returns The entry.
   */
  const entryFor = (id: string): LogEntry => props.entries.find((entry) => entry.id === id)!

  /**
   * One entry's `<details>` row.
   *
   * @param row - The stable record for the entry.
   * @returns The row.
   */
  const row = (row: { id: string }): JSX.Element => {
    const entry = (): LogEntry => entryFor(row.id)
    return (
      <details
        open={isOpen(row.id)}
        onToggle={(event) => {
          const nowOpen = (event.target as HTMLDetailsElement).open
          if (nowOpen !== isOpen(row.id)) toggle(row.id)
        }}
      >
        <summary
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 1),
            cm.sp('px', 2),
            cm.textSize('xs'),
            cm.cursorPointer,
          )}
        >
          <span style={{ width: '48px', 'text-align': 'right', opacity: '0.7' }}>
            {entry().timestamp}
          </span>
          <span
            style={{
              display: 'inline-block',
              'min-width': '48px',
              'text-align': 'center',
              padding: '0 6px',
              'border-radius': '4px',
              background: LEVEL_COLOR[entry().level],
              color: '#fff',
              'font-weight': '700',
              'text-transform': 'uppercase',
            }}
          >
            {entry().level}
          </span>
          {entry().service ? (
            <span class={cm.fontWeight('semibold')}>{entry().service}</span>
          ) : null}
          <span class={cm.flex1}>{entry().message}</span>
          {entry().traceId ? <span style={{ opacity: '0.6' }}>{entry().traceId}</span> : null}
        </summary>
        <Show when={entry().data !== undefined}>
          <pre class={cm.cn(cm.sp('p', 3), cm.textSize('xs'))} style={{ 'overflow-x': 'auto' }}>
            {/* React renders `{''}` as no text node at all. */}
            <Show when={dataText(entry().data) !== ''}>{dataText(entry().data)}</Show>
          </pre>
        </Show>
      </details>
    )
  }

  return (
    <Show
      when={props.entries.length === 0 ? props.emptyState : undefined}
      fallback={
        <div class={cm.cn(cm.stack(1), props.className)} role="log">
          <For each={keyedRows()}>{(record) => row(record)}</For>
        </div>
      }
    >
      {(empty) => empty()}
    </Show>
  )
}
