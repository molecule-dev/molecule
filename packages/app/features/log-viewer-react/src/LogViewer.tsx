import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { slot } from '@molecule/app-react/render'
import { type ColorVariant, getClassMap } from '@molecule/app-ui'
import { Box, Disclosure, Text } from '@molecule/app-ui-react/elements'

/** Severity level of a log entry, ordered from lowest to highest. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** Shape of a single structured log entry rendered by LogViewer. */
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

/** Props for {@link LogViewer}. */
export interface LogViewerProps {
  entries: LogEntry[]
  /** Called when an entry expands/collapses. */
  onToggle?: (id: string, expanded: boolean) => void
  /** Extra classes on the list wrapper. */
  className?: string
  /** Empty-state content. */
  emptyState?: ReactNode
}

/** Severity badge tones: trace neutral → fatal red (themed). */
const LEVEL_TONE: Record<LogLevel, ColorVariant> = {
  trace: 'secondary',
  debug: 'info',
  info: 'success',
  warn: 'warning',
  error: 'error',
  fatal: 'error',
}

/**
 * Structured log list — one `<details>` per entry with timestamp +
 * level badge + service label + single-line message, expanding to
 * show trace id + JSON-formatted structured data.
 *
 * Use for operational tooling, admin dashboards, debug views.
 * @param props - Component props (see {@link LogViewerProps}).
 */
export function LogViewer({
  entries,
  onToggle,
  className,
  emptyState: emptyStateProp,
}: LogViewerProps): JSX.Element {
  const emptyState = slot(emptyStateProp)
  const cm = getClassMap()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  /** Records the resulting state reported by the disclosure for this row. */
  function setEntryOpen(id: string, expanded: boolean): void {
    if (openIds.has(id) === expanded) return
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (expanded) next.add(id)
      else next.delete(id)
      return next
    })
    onToggle?.(id, expanded)
  }

  if (entries.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <Box as="div" className={cm.cn(cm.stack(1 as const), className)} role="log">
      {entries.map((e) => {
        const open = openIds.has(e.id)
        return (
          <Disclosure
            as="details"
            key={e.id}
            open={open}
            onToggle={(expanded) => setEntryOpen(e.id, expanded)}
            summaryProps={{
              className: cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('py', 1),
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.cursorPointer,
              ),
            }}
            summary={
              <>
                <Box as="span" webStyle={{ width: 48, textAlign: 'right', opacity: 0.7 }}>
                  {e.timestamp}
                </Box>
                <Text
                  as="span"
                  className={cm.cn(cm.bgTone(LEVEL_TONE[e.level]), cm.textOnTone)}
                  webStyle={{
                    display: 'inline-block',
                    minWidth: 48,
                    textAlign: 'center',
                    padding: '0 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {e.level}
                </Text>
                {e.service && (
                  <Box as="span" className={cm.fontWeight('semibold')}>
                    {e.service}
                  </Box>
                )}
                <Box as="span" className={cm.flex1}>
                  {e.message}
                </Box>
                {e.traceId && (
                  <Box as="span" webStyle={{ opacity: 0.6 }}>
                    {e.traceId}
                  </Box>
                )}
              </>
            }
          >
            {e.data !== undefined && (
              <Text
                as="pre"
                className={cm.cn(cm.sp('p', 3), cm.textSize('xs'))}
                webStyle={{ overflowX: 'auto' }}
              >
                {typeof e.data === 'string' ? e.data : JSON.stringify(e.data, null, 2)}
              </Text>
            )}
          </Disclosure>
        )
      })}
    </Box>
  )
}
