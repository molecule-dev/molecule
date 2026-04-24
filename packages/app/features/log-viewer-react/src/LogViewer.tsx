import type { ReactNode } from 'react'
import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 *
 */
export interface LogEntry {
  id: string
  /** ISO timestamp or formatted string. */
  timestamp: ReactNode
  /** Severity level. */
  level: LogLevel
  /** Single-line message. */
  message: ReactNode
  /** Optional service / component label (e.g. "auth-api"). */
  service?: ReactNode
  /** Optional trace id / request id. */
  traceId?: ReactNode
  /** Optional structured data shown in the expandable panel. */
  data?: unknown
}

interface LogViewerProps {
  entries: LogEntry[]
  /** Called when an entry expands/collapses. */
  onToggle?: (id: string, expanded: boolean) => void
  /** Extra classes on the list wrapper. */
  className?: string
  /** Empty-state content. */
  emptyState?: ReactNode
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  trace: '#94a3b8',
  debug: '#60a5fa',
  info: '#22c55e',
  warn: '#eab308',
  error: '#ef4444',
  fatal: '#b91c1c',
}

/**
 * Structured log list — one `<details>` per entry with timestamp +
 * level badge + service label + single-line message, expanding to
 * show trace id + JSON-formatted structured data.
 *
 * Use for operational tooling, admin dashboards, debug views.
 * @param root0
 * @param root0.entries
 * @param root0.onToggle
 * @param root0.className
 * @param root0.emptyState
 */
export function LogViewer({ entries, onToggle, className, emptyState }: LogViewerProps) {
  const cm = getClassMap()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  /**
   *
   * @param id
   */
  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onToggle?.(id, next.has(id))
      return next
    })
  }

  if (entries.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className={cm.cn(cm.stack(1 as const), className)} role="log">
      {entries.map((e) => {
        const open = openIds.has(e.id)
        return (
          <details
            key={e.id}
            open={open}
            onToggle={(ev) => {
              const nowOpen = (ev.target as HTMLDetailsElement).open
              if (nowOpen !== open) toggle(e.id)
            }}
          >
            <summary
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('py', 1),
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.cursorPointer,
              )}
            >
              <span style={{ width: 48, textAlign: 'right', opacity: 0.7 }}>{e.timestamp}</span>
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 48,
                  textAlign: 'center',
                  padding: '0 6px',
                  borderRadius: 4,
                  background: LEVEL_COLOR[e.level],
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {e.level}
              </span>
              {e.service && <span className={cm.fontWeight('semibold')}>{e.service}</span>}
              <span className={cm.flex1}>{e.message}</span>
              {e.traceId && <span style={{ opacity: 0.6 }}>{e.traceId}</span>}
            </summary>
            {e.data !== undefined && (
              <pre
                className={cm.cn(cm.sp('p', 3), cm.textSize('xs'))}
                style={{ overflowX: 'auto' }}
              >
                {typeof e.data === 'string' ? e.data : JSON.stringify(e.data, null, 2)}
              </pre>
            )}
          </details>
        )
      })}
    </div>
  )
}
